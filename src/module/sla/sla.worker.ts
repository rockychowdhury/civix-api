import cron from "node-cron";
import { prisma } from "../../lib/prisma";
import {
	LifecycleStatus,
	NotificationType,
	Resource,
	DepartmentRole,
} from "../../../generated/prisma/enums";

export const initSLAWorker = () => {
	// Run every 5 minutes
	cron.schedule("*/5 * * * *", async () => {
		console.log("[SLA Worker] Running SLA breach check...");
		try {
			const now = new Date();

			// 1. Find Response Breaches
			// Issues that are still TRIAGED but targetResponseAt has passed
			const responseBreached = await prisma.civicIssue.findMany({
				where: {
					status: LifecycleStatus.TRIAGED,
					responseDeadlineAt: { lt: now },
					escalations: { none: { reason: "Response SLA Breached" } },
				},
				include: {
					department: {
						include: {
							members: {
								where: { role: DepartmentRole.HEAD },
							},
						},
					},
				},
			});

			for (const issue of responseBreached) {
				await handleEscalation(issue, "Response SLA Breached");
			}

			// 2. Find Resolution Breaches
			// Issues that are NOT resolved/closed but targetResolutionAt has passed
			const resolutionBreached = await prisma.civicIssue.findMany({
				where: {
					status: {
						notIn: [
							LifecycleStatus.RESOLVED,
							LifecycleStatus.CLOSED,
							LifecycleStatus.CANCELLED,
						],
					},
					resolutionDeadlineAt: { lt: now },
					escalations: { none: { reason: "Resolution SLA Breached" } },
				},
				include: {
					department: {
						include: {
							members: {
								where: { role: DepartmentRole.HEAD },
							},
						},
					},
				},
			});

			for (const issue of resolutionBreached) {
				await handleEscalation(issue, "Resolution SLA Breached");
			}

			console.log(
				`[SLA Worker] Processed ${responseBreached.length + resolutionBreached.length} breaches.`,
			);
		} catch (error) {
			console.error("[SLA Worker] Error running SLA check:", error);
		}
	});
};

async function handleEscalation(issue: any, reason: string) {
	await prisma.$transaction(async (tx) => {
		const headUserId = issue.department?.members?.[0]?.staffId || null;

		// Create escalation record
		const escalation = await tx.escalation.create({
			data: {
				civicIssueId: issue.id,
				reason,
				escalationLevel: 1,
				escalatedToId: headUserId,
			},
		});

		// Notify Department Head
		if (headUserId) {
			await tx.notification.create({
				data: {
					userId: headUserId,
					type: NotificationType.ESCALATION,
					title: `SLA Breached: ${issue.issueNumber}`,
					message: `Issue ${issue.issueNumber} has breached its ${reason.toLowerCase()}. Immediate action required.`,
					resourceType: Resource.CIVIC_ISSUE,
					resourceId: issue.id,
				},
			});
		}
	});
}
