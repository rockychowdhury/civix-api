export interface ICreateWorkOrderPayload {
	civicIssueId: string;
	title?: string;
	description?: string;
	scheduledAt?: string;
}

export interface IUpdateWorkOrderStatusPayload {
	status:
	| "ASSIGNED"
	| "IN_PROGRESS"
	| "PENDING_VERIFICATION"
	| "RESOLVED"
	| "CLOSED"
	| "CANCELLED";
}
