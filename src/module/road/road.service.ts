import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateRoadPayload, IRoadFilterableFields, IUpdateRoadPayload } from "./road.interface";

const createRoad = async (payload: ICreateRoadPayload) => {
	const ward = await prisma.ward.findUnique({
		where: { id: payload.wardId },
	});

	if (!ward) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	}

	const existing = await prisma.road.findUnique({
		where: {
			name_wardId: {
				name: payload.name.trim(),
				wardId: payload.wardId,
			},
		},
	});

	if (existing) {
		throw new AppError(httpStatus.CONFLICT, "Road with this name already exists in this ward");
	}

	return await prisma.road.create({
		data: {
			name: payload.name.trim(),
			roadNumber: payload.roadNumber?.trim() || null,
			wardId: payload.wardId,
			isActive: payload.isActive ?? true,
		},
	});
};

const bulkCreateRoads = async (wardId: string, roads: { name: string; roadNumber?: string }[]) => {
	const ward = await prisma.ward.findUnique({
		where: { id: wardId },
	});

	if (!ward) {
		throw new AppError(httpStatus.NOT_FOUND, "Ward not found");
	}

	const createdRoads = [];
	for (const road of roads) {
		const trimmedName = road.name.trim();
		const existing = await prisma.road.findUnique({
			where: {
				name_wardId: {
					name: trimmedName,
					wardId,
				},
			},
		});

		if (!existing) {
			const created = await prisma.road.create({
				data: {
					name: trimmedName,
					roadNumber: road.roadNumber?.trim() || null,
					wardId,
					isActive: true,
				},
			});
			createdRoads.push(created);
		}
	}

	return createdRoads;
};

const getRoadsByWard = async (wardId: string, searchTerm?: string) => {
	const whereCondition: any = {
		wardId,
		isActive: true,
	};

	if (searchTerm) {
		whereCondition.OR = [
			{ name: { contains: searchTerm, mode: "insensitive" } },
			{ roadNumber: { contains: searchTerm, mode: "insensitive" } },
		];
	}

	return await prisma.road.findMany({
		where: whereCondition,
		orderBy: { name: "asc" },
	});
};

const getAllRoads = async (filters: IRoadFilterableFields) => {
	const { searchTerm, wardId, isActive } = filters;
	const whereCondition: any = {};

	if (wardId) {
		whereCondition.wardId = wardId;
	}

	if (typeof isActive !== "undefined") {
		whereCondition.isActive = isActive === "true" || isActive === true;
	}

	if (searchTerm) {
		whereCondition.OR = [
			{ name: { contains: searchTerm, mode: "insensitive" } },
			{ roadNumber: { contains: searchTerm, mode: "insensitive" } },
		];
	}

	return await prisma.road.findMany({
		where: whereCondition,
		include: {
			ward: {
				include: {
					zone: {
						include: {
							municipality: true,
						},
					},
				},
			},
		},
		orderBy: { name: "asc" },
	});
};

const getRoadById = async (id: string) => {
	const road = await prisma.road.findUnique({
		where: { id },
		include: {
			ward: {
				include: {
					zone: {
						include: {
							municipality: true,
						},
					},
				},
			},
		},
	});

	if (!road) {
		throw new AppError(httpStatus.NOT_FOUND, "Road not found");
	}

	return road;
};

const updateRoad = async (id: string, payload: IUpdateRoadPayload) => {
	const road = await prisma.road.findUnique({ where: { id } });
	if (!road) {
		throw new AppError(httpStatus.NOT_FOUND, "Road not found");
	}

	return await prisma.road.update({
		where: { id },
		data: {
			...(payload.name && { name: payload.name.trim() }),
			...(payload.roadNumber !== undefined && { roadNumber: payload.roadNumber?.trim() || null }),
			...(payload.wardId && { wardId: payload.wardId }),
			...(payload.isActive !== undefined && { isActive: payload.isActive }),
		},
	});
};

const deleteRoad = async (id: string) => {
	const road = await prisma.road.findUnique({ where: { id } });
	if (!road) {
		throw new AppError(httpStatus.NOT_FOUND, "Road not found");
	}

	return await prisma.road.delete({ where: { id } });
};

export const RoadService = {
	createRoad,
	bulkCreateRoads,
	getRoadsByWard,
	getAllRoads,
	getRoadById,
	updateRoad,
	deleteRoad,
};

