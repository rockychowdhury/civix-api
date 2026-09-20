import type { LifecycleStatus } from "../../generated/prisma/enums";

interface CivicIssueHistoryPayload {
	civicIssueId: string;
	changedById: string | null;
	previousStatus: LifecycleStatus | null;
	newStatus: LifecycleStatus;
	notes?: string;
	tx: any; // Prisma transaction client
}

/**
 * Records a status transition in the CivicIssueHistory table.
 *
 * This must be called inside every transaction that changes a CivicIssue's
 * status so the full lifecycle is auditable. It is intentionally separate
 * from AuditLog — AuditLog captures *who did what*, while CivicIssueHistory
 * captures *what happened to the issue* and is the source of truth for
 * the citizen-facing timeline.
 *
 * No-ops (previousStatus === newStatus) are silently skipped to avoid
 * polluting the timeline when an idempotent update doesn't actually change
 * the status.
 */
export const createCivicIssueHistory = async (
	payload: CivicIssueHistoryPayload,
) => {
	const { tx, civicIssueId, changedById, previousStatus, newStatus, notes } =
		payload;

	// Skip if the status hasn't actually changed
	if (previousStatus === newStatus) return;

	return tx.civicIssueHistory.create({
		data: {
			civicIssueId,
			changedById,
			previousStatus,
			newStatus,
			notes,
		},
	});
};
