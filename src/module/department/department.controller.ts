import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DepartmentService } from "./department.service";

const createDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.createDepartment(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Department created successfully",
		data: result,
	});
});

const getDepartments = catchAsync(async (req: Request, res: Response) => {
	const { municipalityId } = req.query;
	const result = await DepartmentService.getDepartments(
		municipalityId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Departments retrieved successfully",
		data: result,
	});
});

const getDepartmentById = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.getDepartmentById(
		req.params.id as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department retrieved successfully",
		data: result,
	});
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.updateDepartment(
		req.params.id as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Department updated successfully",
		data: result,
	});
});

const addServiceArea = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.addServiceArea(
		req.params.id as string,
		req.body.wardId,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service area added successfully",
		data: result,
	});
});

const removeServiceArea = catchAsync(async (req: Request, res: Response) => {
	const result = await DepartmentService.removeServiceArea(
		req.params.id as string,
		req.params.areaId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service area removed successfully",
		data: result,
	});
});

const getDepartmentOverview = catchAsync(
	async (req: Request, res: Response) => {
		const userId = (req as any).user.userId;
		const departmentId = req.params.id as string;
		const result = await DepartmentService.getDepartmentOverview(
			userId,
			departmentId,
			req.query as any,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Department overview retrieved successfully",
			data: result,
		});
	},
);

export const DepartmentController = {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	addServiceArea,
	removeServiceArea,
	getDepartmentOverview,
};

