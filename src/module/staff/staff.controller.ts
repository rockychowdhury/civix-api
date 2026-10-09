import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { StaffService } from "./staff.service";
import { pick } from "../../utils/pick";
import { SystemRole } from "../../constant/role.constant";

const createPlatformAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await StaffService.createPlatformAdmin(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Platform Admin created successfully",
		data: result,
	});
});

const createCityAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await StaffService.createCityAdmin(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "City Admin created successfully",
		data: result,
	});
});

const createDepartmentManager = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const result = await StaffService.createDepartmentManager(req.body, userId);
		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "Department Manager created successfully",
			data: result,
		});
	},
);

const createDispatcher = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await StaffService.createDispatcher(req.body, userId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Dispatcher created successfully",
		data: result,
	});
});

const createTechnician = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const result = await StaffService.createTechnician(req.body, userId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Technician created successfully",
		data: result,
	});
});

const getAllStaff = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const filters = pick(req.query, [
		"searchTerm",
		"municipalityId",
		"departmentId",
		"role",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await StaffService.getAllStaff(userId, filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getTechnicians = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const filters = pick(req.query, [
		"searchTerm",
		"municipalityId",
		"departmentId",
	]);
	filters.role = SystemRole.TECHNICIAN; // Override role
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await StaffService.getAllStaff(userId, filters, options);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technicians retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getStaffById = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const { id } = req.params;
	const result = await StaffService.getStaffById(id as string, userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff retrieved successfully",
		data: result,
	});
});

const updateStaffStatus = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const { id } = req.params;
	const { status } = req.body;
	const result = await StaffService.updateStaffStatus(
		id as string,
		status,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff status updated successfully",
		data: result,
	});
});

const updateStaff = catchAsync(async (req: Request, res: Response) => {
	const userId = (req as any).user.userId;
	const { id } = req.params;
	const result = await StaffService.updateStaff(
		id as string,
		req.body as any,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Staff updated successfully",
		data: result,
	});
});

export const StaffController = {
	createPlatformAdmin,
	createCityAdmin,
	createDepartmentManager,
	createDispatcher,
	createTechnician,
	getAllStaff,
	getTechnicians,
	getStaffById,
	updateStaffStatus,
	updateStaff,
};
