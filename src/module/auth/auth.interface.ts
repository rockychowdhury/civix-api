export interface IRegisterCitizen {
	firstName: string;
	lastName: string;
	email: string;
	password?: string;
	phone?: string;
}

export interface ILogin {
	email: string;
	password?: string;
}

export interface IVerifyEmail {
	email: string;
	otp: string;
}

export interface IRefreshToken {
	refreshToken: string;
}

export interface IGoogleAuth {
	idToken: string;
}

export interface IForgotPassword {
	email: string;
}

export interface IResetPassword {
	email: string;
	otp: string;
	newPassword: string;
}
