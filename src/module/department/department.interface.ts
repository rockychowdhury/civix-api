export interface ICreateDepartmentPayload {
	municipalityId: string;
	name: string;
	code: string;
	description?: string;
	email?: string;
	phone?: string;
}

export interface IUpdateDepartmentPayload {
	name?: string;
	description?: string;
	email?: string;
	phone?: string;
	status?: "ACTIVE" | "INACTIVE";
}
