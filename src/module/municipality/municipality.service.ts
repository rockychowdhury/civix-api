import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ServiceCoverageStatus } from "../../../generated/prisma/enums";
import type {
	ICreateMunicipality,
	IUpdateMunicipality,
} from "./municipality.interface";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import { municipalitySearchableFields } from "./municipality.constant";

const getMunicipalities = async (filters: any = {}, options: any = {}) => {
	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		filters,
		options,
		municipalitySearchableFields,
	);

	// Default active coverage if no specific status requested
	if (!where.coverageStatus) {
		where.coverageStatus = { not: ServiceCoverageStatus.INACTIVE };
	}

	const [data, total] = await Promise.all([
		prisma.municipality.findMany({
			where,
			orderBy: Object.keys(orderBy).length ? orderBy : { name: "asc" },
			skip,
			take,
		}),
		prisma.municipality.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const createMunicipality = async (payload: ICreateMunicipality) => {
	const isExists = await prisma.municipality.findUnique({
		where: { code: payload.code },
	});
	if (isExists)
		throw new AppError(httpStatus.CONFLICT, "Municipality code already exists");

	return await prisma.municipality.create({ data: payload });
};

const getMunicipalityById = async (id: string) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");
	return municipality;
};

const updateMunicipality = async (id: string, payload: IUpdateMunicipality) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");

	if (payload.code) {
		const isExists = await prisma.municipality.findFirst({
			where: { code: payload.code, id: { not: id } },
		});
		if (isExists)
			throw new AppError(
				httpStatus.CONFLICT,
				"Municipality code already exists",
			);
	}

	return await prisma.municipality.update({ where: { id }, data: payload });
};

const deleteMunicipality = async (id: string) => {
	const municipality = await prisma.municipality.findUnique({ where: { id } });
	if (!municipality)
		throw new AppError(httpStatus.NOT_FOUND, "Municipality not found");

	return await prisma.municipality.update({
		where: { id },
		data: { coverageStatus: ServiceCoverageStatus.INACTIVE },
	});
};

export const MunicipalityService = {
	getMunicipalities,
	createMunicipality,
	getMunicipalityById,
	updateMunicipality,
	deleteMunicipality,
};
