import type { LifecycleStatus } from "../../../generated/prisma/enums";
import type { IssuePriority } from "../../common/enums/issue-priority.enum";

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
