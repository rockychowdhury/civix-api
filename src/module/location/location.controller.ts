import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { LocationService } from "./location.service";

const createLocation = catchAsync(async (req: Request, res: Response) => {
	const result = await LocationService.createLocation(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Location created successfully",
		data: result,
	});
});

const getLocationById = catchAsync(async (req: Request, res: Response) => {
	const { locationId } = req.params as { locationId: string };
	const result = await LocationService.getLocationById(locationId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Location retrieved successfully",
		data: result,
	});
});

const updateLocation = catchAsync(async (req: Request, res: Response) => {
	const { locationId } = req.params as { locationId: string };
	const result = await LocationService.updateLocation(locationId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Location updated successfully",
		data: result,
	});
});

const resolveLocationWard = catchAsync(async (req: Request, res: Response) => {
	const { locationId } = req.params as { locationId: string };
	const result = await LocationService.resolveLocationWard(locationId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Location ward resolved successfully",
		data: result,
	});
});

const getNearbyLocations = catchAsync(async (req: Request, res: Response) => {
	const result = await LocationService.getNearbyLocations(req);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Nearby locations retrieved successfully",
		data: result,
	});
});

export const LocationController = {
	createLocation,
	getLocationById,
	updateLocation,
	resolveLocationWard,
	getNearbyLocations,
};
