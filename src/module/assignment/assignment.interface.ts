export interface ICreateAssignmentPayload {
	workOrderId: string;
	assignedToId?: string; // Optional if assigned to a team
	teamId?: string; // Optional if assigned to an individual
}

export interface IUpdateAssignmentStatusPayload {
	status: "ACCEPTED" | "REJECTED";
	notes?: string;
}

export interface IReassignAssignmentPayload {
	assignedToId?: string;
	teamId?: string;
	reason?: string;
}
