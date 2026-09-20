import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import type { ICreateFeedbackPayload } from "./feedback.interface";
import {
	Action,
	Resource,
	LifecycleStatus,
} from "../../../generated/prisma/enums";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { feedbackSearchableFields } from "./feedback.constant";

const submitFeedback = async (
	userId: string,
	payload: ICreateFeedbackPayload,
) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { id: payload.serviceRequestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (request.citizenId !== userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only the reporter can submit feedback for this request",
		);
	}

	if (
		request.status !== LifecycleStatus.RESOLVED &&
		request.status !== LifecycleStatus.CLOSED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Feedback can only be submitted for resolved or closed requests",
		);
	}

	const existingFeedback = await prisma.feedback.findUnique({
		where: { serviceRequestId: payload.serviceRequestId },
	});

	if (existingFeedback) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Feedback has already been submitted for this request",
		);
	}

	const result = await prisma.$transaction(async (tx) => {
		const feedback = await tx.feedback.create({
			data: {
				serviceRequestId: payload.serviceRequestId,
				citizenId: userId,
				rating: payload.rating,
				comment: payload.comment,
			},
		});

		// Increase citizen trustLevel if they provide a highly rated positive feedback, just as an example logic
		// Or if it was verified
		await tx.citizenProfile.update({
			where: { userId },
			data: { trustLevel: "TRUSTED" /* TODO */ },
		});

		// Audit Log
		await tx.auditLog.create({
			data: {
				userId,
				action: Action.CREATE,
				resource: Resource.FEEDBACK,
				resourceId: feedback.id,
				newValue: JSON.parse(JSON.stringify(feedback)),
			},
		});

		return feedback;
	});

	return result;
};

const getFeedback = async (filters: any = {}, options: any = {}) => {
	// Need to parse numeric rating correctly for Prisma exact match
	if (filters.rating) filters.rating = Number(filters.rating);

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		feedbackSearchableFields,
	);

	const [data, total] = await Promise.all([
		prisma.feedback.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { createdAt: "desc" },
			skip,
			take,
			include: {
				citizen: { select: { firstName: true, lastName: true } },
				serviceRequest: { select: { trackingNumber: true, title: true } },
			},
		}),
		prisma.feedback.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

export const FeedbackService = {
	submitFeedback,
	getFeedback,
};
