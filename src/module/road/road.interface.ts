export interface IRoadFilterableFields {
	searchTerm?: string;
	wardId?: string;
	isActive?: boolean | string;
}

export interface ICreateRoadPayload {
	name: string;
	roadNumber?: string;
	wardId: string;
	isActive?: boolean;
}

export interface IUpdateRoadPayload {
	name?: string;
	roadNumber?: string;
	wardId?: string;
	isActive?: boolean;
}

