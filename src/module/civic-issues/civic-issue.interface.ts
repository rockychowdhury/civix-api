import type {
	IssuePriority,
	LifecycleStatus,
} from "../../../generated/prisma/enums";

export interface ITriagePayload {
	serviceRequestId: string;
	categoryId: string;
	priority: IssuePriority;
	departmentId: string;
	wardId: string;
}

export interface IMergePayload {
	serviceRequestId: string;
}

export interface IUpdateStatusPayload {
	status: LifecycleStatus;
	notes?: string;
}
