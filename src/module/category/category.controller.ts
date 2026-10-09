import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { pick } from "../../utils/pick";
import { sendResponse } from "../../utils/sendResponse";
import type { ICategoryFilters, ICategoryOptions } from "./category.interface";
import { CategoryService } from "./category.service";

const getCategories = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"searchTerm",
		"departmentId",
		"parentId",
		"isActive",
		"hasChildren",
	]);
	const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

	const result = await CategoryService.getCategories(
		filters as ICategoryFilters,
		options as ICategoryOptions,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Categories retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
	const { categoryId } = req.params as { categoryId: string };
	const result = await CategoryService.getCategoryById(categoryId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category retrieved successfully",
		data: result,
	});
});

const getCategoryChildren = catchAsync(async (req: Request, res: Response) => {
	const { categoryId } = req.params as { categoryId: string };
	const result = await CategoryService.getCategoryChildren(categoryId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category children retrieved successfully",
		data: result,
	});
});

const getCategoryAncestors = catchAsync(async (req: Request, res: Response) => {
	const { categoryId } = req.params as { categoryId: string };
	const result = await CategoryService.getCategoryAncestors(categoryId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category ancestors retrieved successfully",
		data: result,
	});
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
	const result = await CategoryService.createCategory(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Category created successfully",
		data: result,
	});
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
	const { categoryId } = req.params;
	const result = await CategoryService.updateCategory(
		categoryId as string,
		req.body,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category updated successfully",
		data: result,
	});
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
	const { categoryId } = req.params;
	const result = await CategoryService.deleteCategory(categoryId as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Category deleted successfully",
		data: result,
	});
});

export const CategoryController = {
	getCategories,
	getCategoryById,
	getCategoryChildren,
	getCategoryAncestors,
	createCategory,
	updateCategory,
	deleteCategory,
};
