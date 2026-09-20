export interface ICreateStaffPayload {
	email: string;
	password?: string;
	firstName: string;
	lastName: string;
	phone?: string;
	designation?: string;
	municipalityId?: string;
	departmentId?: string;
}

export interface IStaffFilter {
	searchTerm?: string;
	municipalityId?: string;
	departmentId?: string;
	role?: string;
}
