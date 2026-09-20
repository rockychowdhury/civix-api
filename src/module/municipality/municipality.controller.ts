import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { MunicipalityService } from "./municipality.service";

const getMunicipalities = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ["coverageStatus", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await MunicipalityService.getMunicipalities(filters, options);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipalities retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const createMunicipality = catchAsync(async (req: Request, res: Response) => {
	const result = await MunicipalityService.createMunicipality(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Municipality created successfully",
		data: result,
	});
});

const getMunicipalityById = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.params as { municipalityId: string };
	const result = await MunicipalityService.getMunicipalityById(municipalityId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality retrieved successfully",
		data: result,
	});
});

const updateMunicipality = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.params as { municipalityId: string };
	const result = await MunicipalityService.updateMunicipality(
		municipalityId,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality updated successfully",
		data: result,
	});
});

const deleteMunicipality = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.params as { municipalityId: string };
	const result = await MunicipalityService.deleteMunicipality(municipalityId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Municipality deactivated successfully",
		data: result,
	});
});

export const MunicipalityController = {
	getMunicipalities,
	createMunicipality,
	getMunicipalityById,
	updateMunicipality,
	deleteMunicipality,
};
