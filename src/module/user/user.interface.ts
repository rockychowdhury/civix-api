export interface IUser {
	id: string;
	email: string;
	phone?: string;
	passwordHash?: string; // Made optional since it's sensitive
	isEmailVerified: boolean;
	isPhoneVerified: boolean;
	status: string;
	citizenProfile?: ICitizenProfile;
	staffProfile?: IStaffProfile;
	userRoles: IUserRole[];
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

export interface ICitizenProfile {
	id: string;
	userId: string;
	firstName: string;
	lastName: string;
	trustLevel: string;
}

export interface IStaffProfile {
	id: string;
	userId: string;
	employeeId: string;
	firstName: string;
	lastName: string;
}

export interface IUserRole {
	id: string;
	userId: string;
	roleId: string;
	role: IRole;
	createdAt: Date;
}

export interface IRole {
	id: string;
	name: string;
	description?: string | null;
}

export interface IGetUserQuery {
	page?: number;
	limit?: number;
}

export interface IUserUpdatePayload {
	firstName?: string;
	lastName?: string;
	phone?: string;
}

export interface IUserStatusUpdate {
	status: string;
}

export interface IAssignRolePayload {
	role_id: string;
}
