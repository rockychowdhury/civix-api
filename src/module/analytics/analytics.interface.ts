import type {
	LifecycleStatus,
	ServiceCoverageStatus,
	UserStatus,
	CitizenTrustLevel,
} from "../../../generated/prisma/enums";

export interface ISystemOverviewQuery {
	timeRange?: "today" | "this_week" | "this_month" | "this_year" | "all_time";
	startDate?: string;
	endDate?: string;
	municipalityId?: string;
}

export interface ISystemKpis {
	totalMunicipalities: number;
	activeMunicipalities: number;
	totalUsers: number;
	activeUsers: number;
	totalCitizens: number;
	totalStaff: number;
	totalDepartments: number;
	totalWards: number;
	totalCivicIssues: number;
	periodCivicIssues: number;
	resolvedCivicIssues: number;
	closedCivicIssues: number;
	openCivicIssues: number;
	breachedCivicIssues: number;
	systemResolutionRate: number;
	totalWorkOrders: number;
	activeWorkOrders: number;
	averageCitizenRating: number;
	totalFeedbacks: number;
}

export interface ISystemTimeRange {
	filter: string;
	startDate: string | null;
	endDate: string | null;
}

export interface IPriorityStat {
	id: string;
	code: string;
	name: string;
	weight: number;
	colorCode: string | null;
	count: number;
	percentage: number;
}

export interface ISystemCivicIssueStats {
	total: number;
	periodTotal: number;
	openTotal: number;
	resolvedTotal: number;
	closedTotal: number;
	unassignedTotal: number;
	escalatedTotal: number;
	overdueTotal: number;
	resolutionRate: number;
	byStatus: Record<LifecycleStatus | string, number>;
	byPriority: IPriorityStat[];
}

export interface IUserRoleStat {
	roleCode: string;
	roleName: string;
	count: number;
}

export interface ISystemUserStats {
	total: number;
	periodNewUsers: number;
	byStatus: Record<UserStatus | string, number>;
	byRole: IUserRoleStat[];
	citizens: {
		total: number;
		byTrustLevel: Record<CitizenTrustLevel | string, number>;
	};
	staff: {
		total: number;
		availableTechnicians: number;
		busyTechnicians: number;
	};
}

export interface ISystemWorkOrderStats {
	total: number;
	periodTotal: number;
	activeTotal: number;
	completedTotal: number;
	overdueTotal: number;
	byStatus: Record<LifecycleStatus | string, number>;
}

export interface ISystemServiceRequestStats {
	total: number;
	periodTotal: number;
	byStatus: Record<LifecycleStatus | string, number>;
}

export interface IMunicipalityPerformance {
	id: string;
	name: string;
	code: string;
	coverageStatus: ServiceCoverageStatus;
	totalIssues: number;
	openIssues: number;
	resolvedIssues: number;
	resolutionRate: number;
	departmentsCount: number;
	staffCount: number;
	serviceRequestsCount: number;
}

export interface ICategoryDistribution {
	id: string;
	name: string;
	slug: string;
	departmentName: string | null;
	issueCount: number;
	percentage: number;
}

export interface ICitizenSatisfactionStats {
	averageRating: number;
	totalFeedbacks: number;
	satisfactionRate: number;
	ratingDistribution: Record<number, number>;
}

export interface ISlaEscalationStats {
	totalEscalations: number;
	periodEscalations: number;
	unacknowledgedEscalations: number;
	resolvedEscalations: number;
	activeEscalations: number;
	overdueIssuesCount: number;
}

export interface ISystemTrendPoint {
	date: string;
	label: string;
	issuesCreated: number;
	issuesResolved: number;
	newUsers: number;
	workOrdersCreated: number;
}

export interface ICriticalIssueQueueItem {
	id: string;
	issueNumber: string;
	title: string;
	status: LifecycleStatus;
	createdAt: Date;
	responseDeadlineAt: Date | null;
	resolutionDeadlineAt: Date | null;
	reportedCount: number;
	priority: {
		id: string;
		code: string;
		name: string;
		colorCode: string | null;
		weight: number;
	};
	municipality: {
		id: string;
		name: string;
		code: string;
	};
	department: {
		id: string;
		name: string;
		code: string;
	} | null;
	ward: {
		id: string;
		name: string;
		number: string;
	} | null;
}

export interface IRecentEscalationQueueItem {
	id: string;
	escalationLevel: number;
	reason: string;
	escalatedAt: Date;
	acknowledgedAt: Date | null;
	resolvedAt: Date | null;
	civicIssue: {
		id: string;
		issueNumber: string;
		title: string;
		status: LifecycleStatus;
		municipality: {
			id: string;
			name: string;
			code: string;
		};
		priority: {
			code: string;
			colorCode: string | null;
		};
	};
}

export interface IRecentAuditLogItem {
	id: string;
	action: string;
	resource: string;
	resourceId: string | null;
	createdAt: Date;
	ipAddress: string | null;
	user: {
		id: string;
		email: string;
		displayName: string | null;
	} | null;
}

export interface IRecentMunicipalityItem {
	id: string;
	name: string;
	code: string;
	coverageStatus: ServiceCoverageStatus;
	createdAt: Date;
	counts: {
		departments: number;
		staff: number;
		issues: number;
	};
}

export interface IActionableQueues {
	criticalIssues: ICriticalIssueQueueItem[];
	recentEscalations: IRecentEscalationQueueItem[];
	recentAuditLogs: IRecentAuditLogItem[];
	recentMunicipalities: IRecentMunicipalityItem[];
}

export interface ISystemOverviewResponse {
	kpis: ISystemKpis;
	timeRange: ISystemTimeRange;
	civicIssues: ISystemCivicIssueStats;
	users: ISystemUserStats;
	workOrders: ISystemWorkOrderStats;
	serviceRequests: ISystemServiceRequestStats;
	municipalities: IMunicipalityPerformance[];
	categories: ICategoryDistribution[];
	citizenSatisfaction: ICitizenSatisfactionStats;
	slaAndEscalations: ISlaEscalationStats;
	trends: ISystemTrendPoint[];
	actionableQueues: IActionableQueues;
}
