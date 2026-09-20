import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateLocation, IUpdateLocation } from "./location.interface";
import type { Request } from "express";

const createLocation = async (payload: ICreateLocation) => {
	return await prisma.location.create({ data: payload });
};

const getLocationById = async (id: string) => {
	const location = await prisma.location.findUnique({
		where: { id },
		include: { ward: true, zone: true, municipality: true },
	});
	if (!location) throw new AppError(httpStatus.NOT_FOUND, "Location not found");
	return location;
};

const updateLocation = async (id: string, payload: IUpdateLocation) => {
	const location = await prisma.location.findUnique({ where: { id } });
	if (!location) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

	return await prisma.location.update({ where: { id }, data: payload });
};

const resolveLocationWard = async (id: string) => {
	const location = await prisma.location.findUnique({
		where: { id },
		include: { ward: true },
	});
	if (!location) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

	if (location.ward) return location.ward;

	return null;
};

const getNearbyLocations = async (req: Request) => {
	const lat = parseFloat(req.query.lat as string);
	const lng = parseFloat(req.query.lng as string);
	const radius = parseFloat(req.query.radius as string) || 5;

	if (isNaN(lat) || isNaN(lng)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Latitude (lat) and longitude (lng) are required",
		);
	}

	const nearbyLocations = await prisma.$queryRaw`
        SELECT id, address, latitude, longitude,
        (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) AS distance
        FROM "Location"
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND (6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) < ${radius}
        ORDER BY distance ASC
        LIMIT 50
    `;

	return nearbyLocations;
};

export const LocationService = {
	createLocation,
	getLocationById,
	updateLocation,
	resolveLocationWard,
	getNearbyLocations,
};
