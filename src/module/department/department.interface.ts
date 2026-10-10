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

export interface IDepartmentOverviewQuery {
	timeRange?: "today" | "this_week" | "this_month" | "this_year" | "all_time";
	startDate?: string;
	endDate?: string;
}

export interface IDepartmentOverviewResponse {
	department: {
		id: string;
		name: string;
		code: string;
		description: string | null;
		email: string | null;
		phone: string | null;
		status: string;
		municipality: {
			id: string;
			name: string;
			code: string;
		};
		leadership: {
			heads: Array<{
				userId: string;
				employeeId: string;
				name: string;
				designation: string | null;
				email: string;
				phone: string | null;
			}>;
			managers: Array<{
				userId: string;
				employeeId: string;
				name: string;
				designation: string | null;
				email: string;
				phone: string | null;
			}>;
		};
		counts: {
			totalMembers: number;
			totalTeams: number;
			totalServiceAreas: number;
			totalCategories: number;
		};
	};
	timeRange: {
		filter: string;
		startDate: string | null;
		endDate: string | null;
	};
	workOrderStats: {
		total: number;
		periodTotal: number;
		needCrew: number;
		assigned: number;
		inProgress: number;
		pendingVerification: number;
		resolved: number;
		closed: number;
		activeTotal: number;
		overdueCount: number;
	};
	issueQueueStats: {
		total: number;
		openTotal: number;
		periodTotal: number;
		overdueCount: number;
		byStatus: Record<string, number>;
		byPriority: Array<{
			id: string;
			code: string;
			name: string;
			weight: number;
			colorCode: string | null;
			count: number;
		}>;
	};
	staffStats: {
		totalStaff: number;
		technicians: {
			total: number;
			available: number;
			busy: number;
			totalCurrentWorkload: number;
			totalCapacity: number;
			utilizationRate: number;
		};
		dispatchersCount: number;
		technicianRoster: Array<{
			userId: string;
			employeeId: string;
			name: string;
			designation: string | null;
			email: string;
			phone: string | null;
			isAvailable: boolean;
			currentWorkload: number;
			maxWorkload: number;
			utilization: number;
		}>;
	};
	resolutionStats: {
		total: number;
		periodTotal: number;
		pendingVerification: number;
		verified: number;
		rejected: number;
		approvalRate: number;
	};
	queues: {
		unassignedWorkOrders: any[];
		activeWorkOrders: any[];
		pendingVerificationWorkOrders: any[];
		recentWorkUpdates: any[];
	};
}

