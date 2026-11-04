import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { RoadService } from "./road.service";

const createRoad = catchAsync(async (req: Request, res: Response) => {
	const result = await RoadService.createRoad(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Road created successfully",
		data: result,
	});
});

const bulkCreateRoads = catchAsync(async (req: Request, res: Response) => {
	const { wardId, roads } = req.body;
	const result = await RoadService.bulkCreateRoads(wardId, roads);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Roads created successfully",
		data: result,
	});
});

const getRoadsByWard = catchAsync(async (req: Request, res: Response) => {
	const { wardId } = req.params;
	const { searchTerm } = req.query;
	const result = await RoadService.getRoadsByWard(wardId, searchTerm as string | undefined);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Roads retrieved successfully",
		data: result,
	});
});

const getAllRoads = catchAsync(async (req: Request, res: Response) => {
	const result = await RoadService.getAllRoads(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Roads retrieved successfully",
		data: result,
	});
});

const getRoadById = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const result = await RoadService.getRoadById(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Road retrieved successfully",
		data: result,
	});
});

const updateRoad = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const result = await RoadService.updateRoad(id, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Road updated successfully",
		data: result,
	});
});

const deleteRoad = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params;
	const result = await RoadService.deleteRoad(id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Road deleted successfully",
		data: result,
	});
});

export const RoadController = {
	createRoad,
	bulkCreateRoads,
	getRoadsByWard,
	getAllRoads,
	getRoadById,
	updateRoad,
	deleteRoad,
};

