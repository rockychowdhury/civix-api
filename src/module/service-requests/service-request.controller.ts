import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { ServiceRequestService } from "./service-request.service";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await ServiceRequestService.createServiceRequest(
		userId,
		req.body,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service request submitted successfully",
		data: result,
	});
});

const getMyServiceRequests = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const filters = pick(req.query, ["status", "requestType", "searchTerm"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await ServiceRequestService.getMyServiceRequests(
		userId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My service requests retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getServiceRequestById = catchAsync(
	async (req: Request, res: Response) => {
		const id = req.params.id as string;
		const userId = (req as any).user?.userId;

		const result = await ServiceRequestService.getServiceRequestById(
			id,
			userId,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service request retrieved successfully",
			data: result,
		});
	},
);

const getAllServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const filters: Record<string, any> = pick(req.query, [
			"status",
			"municipalityId",
			"requestType",
			"searchTerm",
		]);
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);


		if (req.query.unTriaged === "true") {
			filters.civicIssueId = null;
		}

		const result = await ServiceRequestService.getAllServiceRequests(
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getMunicipalityServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const filters: Record<string, any> = pick(req.query, [
			"status",
			"requestType",
			"searchTerm",
		]);
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
		const municipalityId = req.params.municipalityId;

		if (req.query.unTriaged === "true") {
			filters.civicIssueId = null;
		}
		
		// Force the filter to the requested municipality
		filters.municipalityId = municipalityId;

		// Reusing the same service method but with forced filters
		const result = await ServiceRequestService.getAllServiceRequests(
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Municipality service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getServiceRequestsByCivicIssue = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const civicIssueId = req.params.civicIssueId as string;
	const filters = pick(req.query, ["status", "requestType", "searchTerm", "categoryId"]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await ServiceRequestService.getServiceRequestsByCivicIssue(
		civicIssueId,
		userId,
		filters,
		options,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service requests for civic issue retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

export const ServiceRequestController = {
	createServiceRequest,
	getMyServiceRequests,
	getServiceRequestById,
	getAllServiceRequests,
	getMunicipalityServiceRequests,
	getServiceRequestsByCivicIssue,
};
