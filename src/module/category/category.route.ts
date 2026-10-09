import { Router } from "express";
import { Action, Resource } from "../../../generated/prisma/enums";
import { requirePermission } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = Router();

router.get(
	"/",
	validateRequest(CategoryValidation.getCategoriesQuerySchema),
	CategoryController.getCategories,
);

router.get(
	"/:categoryId/ancestors",
	requirePermission(Action.READ, Resource.CATEGORY),
	validateRequest(CategoryValidation.getCategoryByIdParamsSchema),
	CategoryController.getCategoryAncestors,
);

router.get(
	"/:categoryId/children",
	requirePermission(Action.READ, Resource.CATEGORY),
	validateRequest(CategoryValidation.getCategoryByIdParamsSchema),
	CategoryController.getCategoryChildren,
);

router.get(
	"/:categoryId",
	requirePermission(Action.READ, Resource.CATEGORY),
	validateRequest(CategoryValidation.getCategoryByIdParamsSchema),
	CategoryController.getCategoryById,
);

router.post(
	"/",
	requirePermission(Action.MANAGE, Resource.CATEGORY),
	validateRequest(CategoryValidation.createCategorySchema),
	CategoryController.createCategory,
);

router.patch(
	"/:categoryId",
	requirePermission(Action.MANAGE, Resource.CATEGORY),
	validateRequest(CategoryValidation.updateCategorySchema),
	CategoryController.updateCategory,
);

router.delete(
	"/:categoryId",
	requirePermission(Action.MANAGE, Resource.CATEGORY),
	validateRequest(CategoryValidation.deleteCategorySchema),
	CategoryController.deleteCategory,
);

export const CategoryRoutes = router;
