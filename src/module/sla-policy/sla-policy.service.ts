import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateSlaPolicyPayload,
	IUpdateSlaPolicyPayload,
} from "./sla-policy.interface";

const createSlaPolicy = async (payload: ICreateSlaPolicyPayload) => {
	const existing = await prisma.slaPolicy.findFirst({
		where: {
			municipalityId: payload.municipalityId,
			categoryId: payload.categoryId,
			priorityId: payload.priorityId,
			effectiveTo: null,
		},
	});

	if (existing) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Active SLA Policy already exists for this combination",
		);
	}

	return prisma.slaPolicy.create({
		data: payload,
	});
};

const getSlaPolicies = async (query: any) => {
	const { municipalityId, categoryId } = query;
	const where: any = {};
	if (municipalityId) where.municipalityId = municipalityId;
	if (categoryId) where.categoryId = categoryId;

	return prisma.slaPolicy.findMany({
		where,
		include: {
			municipality: { select: { name: true } },
			category: { select: { name: true } },
			priority: { select: { name: true, code: true, weight: true } },
		},
		orderBy: { createdAt: "desc" },
	});
};

const updateSlaPolicy = async (
	id: string,
	payload: IUpdateSlaPolicyPayload,
) => {
	const sla = await prisma.slaPolicy.findUnique({ where: { id } });
	if (!sla) {
		throw new AppError(httpStatus.NOT_FOUND, "SLA Policy not found");
	}

	return prisma.slaPolicy.update({
		where: { id },
		data: payload,
	});
};

const deleteSlaPolicy = async (id: string) => {
	const sla = await prisma.slaPolicy.findUnique({ where: { id } });
	if (!sla) {
		throw new AppError(httpStatus.NOT_FOUND, "SLA Policy not found");
	}

	return prisma.slaPolicy.delete({
		where: { id },
	});
};

export const SlaPolicyService = {
	createSlaPolicy,
	getSlaPolicies,
	updateSlaPolicy,
	deleteSlaPolicy,
};
