import { prisma } from "../../lib/prisma";
import { IssuePriority } from "../../../generated/prisma/enums";

/**
 * Generate issue title from category name and location.
 */
export const generateIssueTitle = (
	categoryName: string,
	ward?: string | null,
	zone?: string | null,
): string => {
	let title = `${categoryName} reported`;
	const locationParts: string[] = [];
	if (ward) locationParts.push(`Ward ${ward}`);
	if (zone) locationParts.push(`Zone ${zone}`);

	if (locationParts.length > 0) {
		title += ` in ${locationParts.join(", ")}`;
	}
	return title;
};

/**
 * Generate issue description from category name, description, and location.
 */
export const generateIssueDescription = (
	categoryName: string,
	categoryDescription: string | null | undefined,
	location: {
		address?: string | null;
		wardId?: string | null;
		zoneId?: string | null;
		landmark?: string | null;
		postalCode?: string | null;
	},
	initialDescription: string,
	date: Date,
): string => {
	const formattedDate = new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);

	const locationParts: string[] = [];
	if (location.address) locationParts.push(location.address);
	if (location.wardId) locationParts.push(`Ward ${location.wardId}`);
	if (location.zoneId) locationParts.push(`Zone ${location.zoneId}`);
	if (location.landmark) locationParts.push(`Landmark: ${location.landmark}`);
	if (location.postalCode) locationParts.push(location.postalCode);

	const formattedLocation = locationParts.join(", ") || "Unknown Location";

	return `${categoryName} reported at ${formattedDate} in ${formattedLocation}. Initial Report: ${initialDescription}`;
};

/**
 * Calculate priority score.
 */
export const priorityScore = (
	baseSeverity: number,
	reportCount: number,
	hoursSinceFirstReport: number,
): number => {
	const reportCountWeight = Math.min(reportCount * 2, 20); // Cap the report count contribution
	const ageWeight = Math.min(hoursSinceFirstReport * 0.5, 20); // Cap the age contribution

	return baseSeverity + reportCountWeight + ageWeight;
};

/**
 * Get issue priority enum based on numeric score.
 */
export const getIssuePriority = (score: number): IssuePriority => {
	if (score >= 40) return IssuePriority.EMERGENCY;
	if (score >= 30) return IssuePriority.URGENT;
	if (score >= 20) return IssuePriority.HIGH;
	if (score >= 10) return IssuePriority.MEDIUM;
	return IssuePriority.LOW;
};

/**
 * Calculate response deadline.
 */
export const calculateResponseDeadline = (
	responseMinutes: number,
	fromDate: Date = new Date(),
): Date => {
	return new Date(fromDate.getTime() + responseMinutes * 60 * 1000);
};

/**
 * Calculate resolution deadline.
 */
export const calculateResolutionDeadline = (
	resolutionMinutes: number,
	fromDate: Date = new Date(),
): Date => {
	return new Date(fromDate.getTime() + resolutionMinutes * 60 * 1000);
};

export const generateTrackingNumber = async (): Promise<string> => {
	const prefix = "REQ";
	const date = new Date();
	const year = date.getFullYear().toString().slice(-2);
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");

	const dateString = `${year}${month}${day}`;

	// Find the latest request created today to increment the counter
	const latestRequest = await prisma.serviceRequest.findFirst({
		where: {
			trackingNumber: {
				startsWith: `${prefix}-${dateString}`,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			trackingNumber: true,
		},
	});

	let nextSequence = 1;

	if (latestRequest?.trackingNumber) {
		const parts = (latestRequest.trackingNumber as string).split("-");
		if (parts.length === 3) {
			const lastSequence = parseInt(parts[2] as string, 10);
			if (!isNaN(lastSequence)) {
				nextSequence = lastSequence + 1;
			}
		}
	}

	const sequenceString = nextSequence.toString().padStart(4, "0");

	// Format: REQ-YYMMDD-0001
	return `${prefix}-${dateString}-${sequenceString}`;
};

export const generateIssueNumber = async (): Promise<string> => {
	const prefix = "ISS";
	const date = new Date();
	const year = date.getFullYear().toString().slice(-2);
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");

	const dateString = `${year}${month}${day}`;

	const latestIssue = await prisma.civicIssue.findFirst({
		where: {
			issueNumber: {
				startsWith: `${prefix}-${dateString}`,
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			issueNumber: true,
		},
	});

	let nextSequence = 1;

	if (latestIssue?.issueNumber) {
		const parts = (latestIssue.issueNumber as string).split("-");
		if (parts.length === 3) {
			const lastSequence = parseInt(parts[2] as string, 10);
			if (!isNaN(lastSequence)) {
				nextSequence = lastSequence + 1;
			}
		}
	}

	const sequenceString = nextSequence.toString().padStart(4, "0");

	// Format: ISS-YYMMDD-0001
	return `${prefix}-${dateString}-${sequenceString}`;
};
