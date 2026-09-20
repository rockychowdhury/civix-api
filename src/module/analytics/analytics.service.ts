import { prisma } from "../../lib/prisma";
import { LifecycleStatus } from "../../../generated/prisma/enums";

const getDashboardStats = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};

	const totalIssues = await prisma.civicIssue.count({ where });

	const resolvedIssues = await prisma.civicIssue.count({
		where: { ...where, status: LifecycleStatus.RESOLVED },
	});

	const openIssues = await prisma.civicIssue.count({
		where: {
			...where,
			status: {
				notIn: [
					LifecycleStatus.RESOLVED,
					LifecycleStatus.CLOSED,
					LifecycleStatus.CANCELLED,
				],
			},
		},
	});

	// Breached issues (those that have escalations)
	const breachedIssues = await prisma.civicIssue.count({
		where: {
			...where,
			escalations: { some: {} },
		},
	});

	return {
		totalIssues,
		resolvedIssues,
		openIssues,
		breachedIssues,
		resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0,
	};
};

const getIssuesByDepartment = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};

	const departments = await prisma.department.findMany({
		where,
		include: {
			_count: {
				select: { civicIssues: true },
			},
		},
	});

	return departments.map((dept) => ({
		id: dept.id,
		name: dept.name,
		issueCount: dept._count.civicIssues,
	}));
};

const getIssuesByWard = async (municipalityId?: string) => {
	const where = municipalityId ? { zone: { municipalityId } } : {};

	const wards = await prisma.ward.findMany({
		where,
		include: {
			_count: {
				select: { civicIssues: true },
			},
		},
	});

	return wards.map((ward) => ({
		id: ward.id,
		name: ward.name,
		number: ward.number,
		issueCount: ward._count.civicIssues,
	}));
};

export const AnalyticsService = {
	getDashboardStats,
	getIssuesByDepartment,
	getIssuesByWard,
};
