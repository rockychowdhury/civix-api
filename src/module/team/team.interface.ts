export interface ICreateTeamPayload {
	name: string;
	code: string;
	departmentId: string;
	leaderId?: string;
	memberIds?: string[];
}

export interface ITeamFilter {
	searchTerm?: string;
	departmentId?: string;
	status?: string;
}
