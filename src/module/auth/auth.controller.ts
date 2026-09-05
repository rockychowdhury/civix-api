import { Request, Response } from "express";
import httpStatus from "http-status";
import {catchAsync} from "../../utils/catchAsync";
import {sendResponse} from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

const registerCitizen = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.registerCitizen(payload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Citizen registered successfully. Verification OTP Sent.",
		data: result,
	});
});

const login = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.loginUser(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.verifyEmail(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Email verified successfully",
		data: result,
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	// Assuming user ID is attached to req.user by an auth middleware
	const userId = (req as any).user?.userId; // Adjust this based on your auth middleware
	
	const result = await AuthService.getMe(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile retrieved successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const { refreshToken } = req.cookies;
	
	const result = await AuthService.refreshToken(refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Token refreshed successfully",
		data: result,
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.googleLogin(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged in with Google successfully",
		data: result,
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.forgotPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password reset link/OTP sent successfully",
		data: result,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	
	const result = await AuthService.resetPassword(payload);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password reset successfully",
		data: result,
	});
});

export const AuthController = {
	registerCitizen,
	login,
	verifyEmail,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};

