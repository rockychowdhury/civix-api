import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pick } from "../../utils/pick";
import { ServiceRequestService } from "./service-request.service";

const createServiceRequest = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

	const result = await ServiceRequestService.createServiceRequest(
		userId,
		req.body,
		idempotencyKey
	);

	sendResponse(res, {
		statusCode: httpStatus.ACCEPTED,
		success: true,
		message: "Service request accepted for background processing",
		data: result,
	});
});

const getServiceRequestByTrackingNumber = catchAsync(
	async (req: Request, res: Response) => {
		const trackingNumber = req.params.trackingNumber as string;
		const result =
			await ServiceRequestService.getServiceRequestByTrackingNumber(
				trackingNumber,
			);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Service request tracking details retrieved successfully",
			data: result,
		});
	},
);

const getMyServiceRequests = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const filters = pick(req.query, [
		"status",
		"requestType",
		"searchTerm",
		"pendingFeedback",
	]);
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

const getPendingFeedbackRequests = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const filters = pick(req.query, ["status", "requestType", "searchTerm"]);
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

		const result =
			await ServiceRequestService.getPendingFeedbackServiceRequests(
				userId,
				filters,
				options,
			);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Pending feedback service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

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
		const municipalityId = req.params.municipalityId as string;

		if (req.query.unTriaged === "true") {
			filters.civicIssueId = null;
		}

		const userId = (req as any).user.userId;

		const result = await ServiceRequestService.getMunicipalityServiceRequests(
			userId,
			municipalityId,
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

const getServiceRequestsByCivicIssue = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const civicIssueId = req.params.civicIssueId as string;
		const filters = pick(req.query, [
			"status",
			"requestType",
			"searchTerm",
			"categoryId",
		]);
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
	},
);

const getDepartmentServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const departmentId = req.params.departmentId as string;
		const filters = pick(req.query, [
			"status",
			"stage",
			"categoryId",
			"wardId",
			"municipalityId",
			"searchTerm",
		]);
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

		const result = await ServiceRequestService.getDepartmentServiceRequests(
			userId,
			departmentId,
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getDepartmentServiceRequestQueue = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const departmentId = req.params.departmentId as string;
		const filters = {
			...pick(req.query, [
				"categoryId",
				"wardId",
				"municipalityId",
				"searchTerm",
			]),
			stage: "queue",
		};
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

		const result = await ServiceRequestService.getDepartmentServiceRequests(
			userId,
			departmentId,
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department service request queue (pending triage) retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getDepartmentInProgressServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const departmentId = req.params.departmentId as string;
		const filters = {
			...pick(req.query, [
				"categoryId",
				"wardId",
				"municipalityId",
				"searchTerm",
			]),
			stage: "in_progress",
		};
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

		const result = await ServiceRequestService.getDepartmentServiceRequests(
			userId,
			departmentId,
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department in-progress service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getDepartmentResolvedServiceRequests = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const departmentId = req.params.departmentId as string;
		const filters = {
			...pick(req.query, [
				"categoryId",
				"wardId",
				"municipalityId",
				"searchTerm",
			]),
			stage: "resolved",
		};
		const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

		const result = await ServiceRequestService.getDepartmentServiceRequests(
			userId,
			departmentId,
			filters,
			options,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department resolved service requests retrieved successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

export const ServiceRequestController = {
	createServiceRequest,
	getMyServiceRequests,
	getPendingFeedbackRequests,
	getServiceRequestById,
	getServiceRequestByTrackingNumber,
	getAllServiceRequests,
	getMunicipalityServiceRequests,
	getServiceRequestsByCivicIssue,
	getDepartmentServiceRequests,
	getDepartmentServiceRequestQueue,
	getDepartmentInProgressServiceRequests,
	getDepartmentResolvedServiceRequests,
};
