import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { ZoneService } from "./zone.service";

const getZones = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"municipalityId",
		"coverageStatus",
		"searchTerm",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await ZoneService.getZones(filters, options);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zones retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const createZone = catchAsync(async (req: Request, res: Response) => {
	const result = await ZoneService.createZone(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Zone created successfully",
		data: result,
	});
});

const getZoneById = catchAsync(async (req: Request, res: Response) => {
	const { zoneId } = req.params as { zoneId: string };
	const result = await ZoneService.getZoneById(zoneId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone retrieved successfully",
		data: result,
	});
});

const updateZone = catchAsync(async (req: Request, res: Response) => {
	const { zoneId } = req.params as { zoneId: string };
	const result = await ZoneService.updateZone(zoneId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone updated successfully",
		data: result,
	});
});

const deleteZone = catchAsync(async (req: Request, res: Response) => {
	const { zoneId } = req.params as { zoneId: string };
	const result = await ZoneService.deleteZone(zoneId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone deactivated successfully",
		data: result,
	});
});

const getZoneWards = catchAsync(async (req: Request, res: Response) => {
	const { zoneId } = req.params as { zoneId: string };
	const result = await ZoneService.getZoneWards(zoneId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Zone wards retrieved successfully",
		data: result,
	});
});

export const ZoneController = {
	getZones,
	createZone,
	getZoneById,
	updateZone,
	deleteZone,
	getZoneWards,
};
