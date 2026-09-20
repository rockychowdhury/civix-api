import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateWorkUpdatePayload } from "./work-update.interface";
import { LifecycleStatus } from "../../../generated/prisma/enums";
import { createCivicIssueHistory } from "../../utils/civicIssueHistory";

const createWorkUpdate = async (
	userId: string,
	workOrderId: string,
	payload: ICreateWorkUpdatePayload,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: workOrderId },
		include: { currentAssignee: true },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	}

	if (workOrder.currentAssigneeId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only the assigned technician can post updates",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		const update = await tx.workUpdate.create({
			data: {
				workOrderId,
				technicianId: userId,
				updateType: payload.updateType,
				note: payload.notes,
			},
		});

		if (payload.attachmentIds && payload.attachmentIds.length > 0) {
			await tx.attachment.updateMany({
				where: { id: { in: payload.attachmentIds }, uploadedById: userId },
				data: { workUpdateId: update.id },
			});
		}

		// Adjust work order status based on update type
		let newStatus: LifecycleStatus | null = null;
		if (payload.updateType === "ON_SITE" || payload.updateType === "RESUMED") {
			newStatus = LifecycleStatus.IN_PROGRESS;
		} else if (payload.updateType === "COMPLETED") {
			newStatus = LifecycleStatus.PENDING_VERIFICATION;
		}

		if (newStatus && newStatus !== workOrder.status) {
			await tx.workOrder.update({
				where: { id: workOrderId },
				data: {
					status: newStatus,
					...(newStatus === LifecycleStatus.IN_PROGRESS && {
						startedAt: new Date(),
					}),
				},
			});

			await tx.civicIssue.update({
				where: { id: workOrder.civicIssueId },
				data: { status: newStatus },
			});

			await tx.serviceRequest.updateMany({
				where: { civicIssueId: workOrder.civicIssueId },
				data: { status: newStatus },
			});

			await createCivicIssueHistory({
				civicIssueId: workOrder.civicIssueId,
				changedById: userId,
				previousStatus: workOrder.status as LifecycleStatus,
				newStatus,
				notes: `Technician posted ${payload.updateType} update${payload.notes ? `: ${payload.notes}` : ""}`,
				tx,
			});
		}

		return tx.workUpdate.findUnique({
			where: { id: update.id },
			include: { attachments: true },
		});
	});

	return result;
};

export const WorkUpdateService = {
	createWorkUpdate,
};
