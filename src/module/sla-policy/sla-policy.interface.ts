export interface ICreateSlaPolicyPayload {
	municipalityId: string;
	categoryId: string;
	priorityId: string;
	responseMinutes: number;
	resolutionMinutes: number;
	assignmentType?: "INDIVIDUAL" | "TEAM";
}

export interface IUpdateSlaPolicyPayload {
	responseMinutes?: number;
	resolutionMinutes?: number;
	assignmentType?: "INDIVIDUAL" | "TEAM";
	effectiveTo?: Date;
}
