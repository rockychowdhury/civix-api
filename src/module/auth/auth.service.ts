/** biome-ignore-all lint/style/useConst: <explanation> */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
import { UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPassword,
	IGoogleAuth,
	ILogin,
	IRegisterCitizen,
	IResetPassword,
	IVerifyEmail,
} from "./auth.interface";

const registerCitizen = async (payload: IRegisterCitizen) => {
	const { firstName, lastName, password, phone } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const hashedPassword = password
		? await bcrypt.hash(password, Number(config.bcrypt_salt_rounds) || 8)
		: "";

	const expirationSeconds = 5 * 60;
	const otpKey = `citizen-registration-otp:${email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const citizenRegistrationKey = `citizen-registration-data:${email}`;
	const redisUserDataPayload = {
		firstName,
		lastName,
		email,
		password: hashedPassword,
		phone,
	};

	await redisClient.set(
		citizenRegistrationKey,
		JSON.stringify(redisUserDataPayload),
		{
			expiration: {
				type: "EX",
				value: expirationSeconds,
			},
		},
	);

	const templatePath = path.join(
		process.cwd(),
		"src/templates/registration-citizen-otp.ejs",
	);

	const templateData = {
		name: firstName,
		email,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Email Verification",
		html,
	});
};

const verifyEmail = async (payload: IVerifyEmail) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExist?.status === "BANNED" || isUserExist?.status === "SUSPENDED") {
		throw new AppError(httpStatus.FORBIDDEN, `User is ${isUserExist.status}`);
	}

	if (isUserExist?.isEmailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email Already Verified");
	}

	if (isUserExist?.deletedAt) {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	const otpKey = `citizen-registration-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	await redisClient.del(otpKey);

	const citizenRegistrationKey = `citizen-registration-data:${email}`;
	const redisCitizenData = await redisClient.get(citizenRegistrationKey);

	if (!redisCitizenData) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Registration data expired or doesn't exist",
		);
	}

	const citizenPayload: IRegisterCitizen = JSON.parse(redisCitizenData);

	// Optional: Assign a default role for citizens
	const citizenRole = await prisma.role.findUnique({
		where: { name: "CITIZEN" },
	});

	const createdUser = await prisma.user.create({
		data: {
			email: citizenPayload.email,
			passwordHash: citizenPayload.password || "",
			phone: citizenPayload.phone,
			status: UserStatus.ACTIVE,
			isEmailVerified: true,
			citizenProfile: {
				create: {
					firstName: citizenPayload.firstName,
					lastName: citizenPayload.lastName,
				},
			},
			...(citizenRole && {
				userRoles: {
					create: {
						roleId: citizenRole.id,
					},
				},
			}),
		},
		include: { citizenProfile: true, userRoles: { include: { role: true } } },
	});

	await redisClient.del(citizenRegistrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/templates/citizen-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.citizenProfile?.firstName,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome To Civix",
		html,
	});

	const { citizenProfile, passwordHash, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		email: user.email,
		roles: user.userRoles.map((ur) => ur.role.name),
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		citizenProfile,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILogin) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
		include: { userRoles: { include: { role: true } } },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
	}

	if (
		user.status === UserStatus.BANNED ||
		user.status === UserStatus.SUSPENDED
	) {
		throw new AppError(httpStatus.FORBIDDEN, `User is ${user.status}`);
	}

	if (user.deletedAt) {
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted");
	}

	if (user.passwordHash === "" && password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User Might Have Registered With Google. Try To Login With Google.",
		);
	}

	if (password) {
		const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);

		if (!isPasswordMatched) {
			throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
		}
	}

	const jwtPayload = {
		userId: user.id,
		email: user.email,
		roles: user.userRoles.map((ur) => ur.role.name),
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			citizenProfile: true,
			staffProfile: true,
			userRoles: { include: { role: true } },
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const { passwordHash, ...userWithoutPassword } = user;
	return userWithoutPassword;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
		include: { userRoles: { include: { role: true } } },
	});

	if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User is inactive or not found",
		);
	}

	const jwtPayload = {
		userId: user.id,
		email: user.email,
		roles: user.userRoles.map((ur) => ur.role.name),
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const newRefreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken: newRefreshToken,
	};
};

const googleLogin = async (payload: IGoogleAuth) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google ID Token Verification Failed", error);
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid Or Expired Google Id Token",
		);
	}

	if (!googleIdTokenPayload) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid Or Expired Google Id Token",
		);
	}

	if (!googleIdTokenPayload.email) {
		throw new AppError(httpStatus.BAD_REQUEST, "Google Email Not Found");
	}
	if (!googleIdTokenPayload.given_name || !googleIdTokenPayload.family_name) {
		throw new AppError(httpStatus.BAD_REQUEST, "Google User Name Not Found");
	}

	let user = await prisma.user.findUnique({
		where: { email: googleIdTokenPayload.email },
		include: { userRoles: { include: { role: true } } },
	});

	if (user) {
		if (!user.isEmailVerified) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: { isEmailVerified: true },
				include: { userRoles: { include: { role: true } } },
			});
		}

		if (
			user.status === UserStatus.BANNED ||
			user.status === UserStatus.SUSPENDED
		) {
			throw new AppError(httpStatus.FORBIDDEN, `User Is ${user.status}`);
		}

		if (user.deletedAt) {
			throw new AppError(httpStatus.FORBIDDEN, "User Is Deleted");
		}
	} else {
		const citizenRole = await prisma.role.findUnique({
			where: { name: "CITIZEN" },
		});
		user = await prisma.user.create({
			data: {
				email: googleIdTokenPayload.email,
				passwordHash: "",
				status: UserStatus.ACTIVE,
				isEmailVerified: true,
				citizenProfile: {
					create: {
						firstName: googleIdTokenPayload.given_name,
						lastName: googleIdTokenPayload.family_name || "",
					},
				},
				...(citizenRole && {
					userRoles: {
						create: {
							roleId: citizenRole.id,
						},
					},
				}),
			},
			include: { userRoles: { include: { role: true } } },
		});

		const templatePath = path.join(
			process.cwd(),
			"src/templates/citizen-welcome-email.ejs",
		);

		const templateData = {
			name: googleIdTokenPayload.given_name,
		};

		const html = await ejs.renderFile(templatePath, templateData);

		await transporter.sendMail({
			from: config.email_sender,
			to: user.email,
			subject: "Welcome To Civix",
			html,
		});
	}

	const jwtPayload = {
		userId: user.id,
		email: user.email,
		roles: user.userRoles.map((ur) => ur.role.name),
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const forgotPassword = async (payload: IForgotPassword) => {
	const { email } = payload;

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist!");
	}

	if (
		isUserExist.status === UserStatus.BANNED ||
		isUserExist.status === UserStatus.SUSPENDED
	) {
		throw new AppError(httpStatus.FORBIDDEN, `User is ${isUserExist.status}`);
	}

	if (!isUserExist.isEmailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "User Not Verified");
	}

	if (isUserExist.deletedAt) {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	if (isUserExist.passwordHash === "") {
		throw new AppError(httpStatus.BAD_REQUEST, "User Has Account With Google");
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forgot-password-otp:${isUserExist.email}`;
	const expirationSeconds = 5 * 60;

	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/templates/forgot-password.ejs",
	);

	const templateData = {
		name: isUserExist.email.split("@")[0],
		otp,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Forgot Password",
		html,
	});
};

const resetPassword = async (payload: IResetPassword) => {
	const { email, otp, newPassword } = payload;

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User Does Not Exist!");
	}

	if (
		isUserExist.status === UserStatus.BANNED ||
		isUserExist.status === UserStatus.SUSPENDED
	) {
		throw new AppError(httpStatus.FORBIDDEN, `User is ${isUserExist.status}`);
	}

	if (!isUserExist.isEmailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "User Not Verified");
	}

	if (isUserExist.deletedAt) {
		throw new AppError(httpStatus.FORBIDDEN, "User is Deleted");
	}

	if (isUserExist.passwordHash === "") {
		throw new AppError(httpStatus.BAD_REQUEST, "User Has Account With Google");
	}

	const key = `forgot-password-otp:${isUserExist.email}`;
	const redisOtp = await redisClient.get(key);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
	}

	const hashedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds) || 8,
	);

	await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			passwordHash: hashedNewPassword,
		},
	});

	await redisClient.del(key);

	const templatePath = path.join(
		process.cwd(),
		"src/templates/reset-password-success.ejs",
	);

	const templateData = {
		name: isUserExist.email.split("@")[0],
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Password Changed",
		html,
	});
};

export const AuthService = {
	registerCitizen,
	verifyEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
