import type { ServiceCoverageStatus } from "../../../generated/prisma/enums";

export interface ICreateMunicipality {
	name: string;
	code: string;
	countryCode?: string;
	timezone?: string;
}

export interface IUpdateMunicipality {
	name?: string;
	code?: string;
	countryCode?: string;
	timezone?: string;
	coverageStatus?: ServiceCoverageStatus;
}

export interface IMunicipalityOverviewQuery {
	timeRange?: "today" | "this_week" | "this_month" | "this_year" | "all_time";
	startDate?: string;
	endDate?: string;
}

export interface IMunicipalityOverviewResponse {
	municipality: {
		id: string;
		name: string;
		code: string;
		countryCode: string | null;
		timezone: string | null;
		coverageStatus: string;
		counts: {
			totalDepartments: number;
			totalZones: number;
			totalWards: number;
			totalStaff: number;
			totalSlaPolicies: number;
		};
	};
	timeRange: {
		filter: string;
		startDate: string | null;
		endDate: string | null;
	};
	issueStats: {
		total: number;
		periodTotal: number;
		openTotal: number;
		unassignedQueue: number;
		escalatedCount: number;
		overdueCount: number;
		resolvedTotal: number;
		closedTotal: number;
		resolutionRate: number;
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
	serviceRequestStats: {
		total: number;
		periodTotal: number;
		queueCount: number;
		inProgressCount: number;
		resolvedCount: number;
		byStatus: Record<string, number>;
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
	staffStats: {
		totalStaff: number;
		byRole: Record<string, number>;
		technicians: {
			total: number;
			available: number;
			busy: number;
		};
	};
	departmentPerformance: Array<{
		id: string;
		name: string;
		code: string;
		staffCount: number;
		activeWorkOrders: number;
		openIssues: number;
		resolvedIssues: number;
		escalatedIssues: number;
	}>;
	wardHotspots: Array<{
		id: string;
		wardNumber: string;
		name: string;
		zoneName: string;
		openIssuesCount: number;
		totalIssuesCount: number;
	}>;
	citizenSatisfaction: {
		averageRating: number;
		totalFeedbacks: number;
		ratingDistribution: Record<number, number>;
	};
	quickQueues: {
		criticalEscalatedIssues: any[];
		overdueWorkOrders: any[];
		recentIssues: any[];
	};
}

