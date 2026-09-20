import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";
import type { ICreateWard, IUpdateWard } from "./ward.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { wardSearchableFields } from "./ward.constant";

const getWards = async (filters: any = {}, options: any = {}) => {
	const { municipalityId, ...restFilters } = filters;

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		restFilters,
		options,
		wardSearchableFields,
	);

	if (!where.coverageStatus) {
		where.coverageStatus = { not: ServiceCoverageStatus.INACTIVE };
	}

	if (municipalityId) {
		where.zone = { municipalityId };
	}

	const [data, total] = await Promise.all([
		prisma.ward.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { number: "asc" },
			skip,
			take,
		}),
		prisma.ward.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const createWard = async (payload: ICreateWard) => {
	const zone = await prisma.zone.findUnique({ where: { id: payload.zoneId } });
	if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");

	const existingWard = await prisma.ward.findFirst({
		where: { number: payload.number, zoneId: payload.zoneId },
	});
	if (existingWard)
		throw new AppError(
			httpStatus.CONFLICT,
			"Ward number already exists in this zone",
		);

	return await prisma.ward.create({ data: payload });
};

const getWardById = async (id: string) => {
	const ward = await prisma.ward.findUnique({ where: { id } });
	if (!ward) throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	return ward;
};

const updateWard = async (id: string, payload: IUpdateWard) => {
	const ward = await prisma.ward.findUnique({ where: { id } });
	if (!ward) throw new AppError(httpStatus.NOT_FOUND, "Ward not found");

	if (payload.zoneId) {
		const zone = await prisma.zone.findUnique({
			where: { id: payload.zoneId },
		});
		if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
	}

	if (payload.number || payload.zoneId) {
		const checkNumber = payload.number || ward.number;
		const checkZone = payload.zoneId || ward.zoneId;
		const existingWard = await prisma.ward.findFirst({
			where: { number: checkNumber, zoneId: checkZone, id: { not: id } },
		});
		if (existingWard)
			throw new AppError(
				httpStatus.CONFLICT,
				"Ward number already exists in this zone",
			);
	}

	return await prisma.ward.update({ where: { id }, data: payload });
};

const deleteWard = async (id: string) => {
	const ward = await prisma.ward.findUnique({ where: { id } });
	if (!ward) throw new AppError(httpStatus.NOT_FOUND, "Ward not found");

	return await prisma.ward.update({
		where: { id },
		data: { coverageStatus: ServiceCoverageStatus.INACTIVE },
	});
};

const getWardDepartments = async (id: string) => {
	const ward = await prisma.ward.findUnique({
		where: { id },
		include: { zone: true },
	});
	if (!ward) throw new AppError(httpStatus.NOT_FOUND, "Ward not found");

	const municipalityId = ward.zone.municipalityId;
	return await prisma.department.findMany({
		where: { municipalityId },
	});
};

export const WardService = {
	getWards,
	createWard,
	getWardById,
	updateWard,
	deleteWard,
	getWardDepartments,
};
