import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";
import type { ICreateZone, IUpdateZone } from "./zone.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { zoneSearchableFields } from "./zone.constant";

const getZones = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		zoneSearchableFields,
	);

	if (!where.coverageStatus) {
		where.coverageStatus = { not: ServiceCoverageStatus.INACTIVE };
	}

	const [data, total] = await Promise.all([
		prisma.zone.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { name: "asc" },
			skip,
			take,
		}),
		prisma.zone.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const createZone = async (payload: ICreateZone) => {
	const municipality = await prisma.municipality.findUnique({
		where: { id: payload.municipalityId },
	});
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");

	return await prisma.zone.create({ data: payload });
};

const getZoneById = async (id: string) => {
	const zone = await prisma.zone.findUnique({ where: { id } });
	if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
	return zone;
};

const updateZone = async (id: string, payload: IUpdateZone) => {
	const zone = await prisma.zone.findUnique({ where: { id } });
	if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");

	if (payload.municipalityId) {
		const municipality = await prisma.municipality.findUnique({
			where: { id: payload.municipalityId },
		});
		if (!municipality)
			throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	}

	return await prisma.zone.update({ where: { id }, data: payload });
};

const deleteZone = async (id: string) => {
	const zone = await prisma.zone.findUnique({ where: { id } });
	if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");

	return await prisma.zone.update({
		where: { id },
		data: { coverageStatus: ServiceCoverageStatus.INACTIVE },
	});
};

const getZoneWards = async (id: string) => {
	const zone = await prisma.zone.findUnique({ where: { id } });
	if (!zone) throw new AppError(httpStatus.NOT_FOUND, "Zone not found");

	return await prisma.ward.findMany({
		where: {
			zoneId: id,
			coverageStatus: { not: ServiceCoverageStatus.INACTIVE },
		},
		orderBy: { number: "asc" },
	});
};

export const ZoneService = {
	getZones,
	createZone,
	getZoneById,
	updateZone,
	deleteZone,
	getZoneWards,
};
