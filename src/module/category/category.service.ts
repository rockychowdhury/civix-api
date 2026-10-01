import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPrismaQuery } from "../../utils/QueryBuilder";
import {
	categoryPublicSelect,
	categorySearchableFields,
	categorySortableFields,
} from "./category.constant";
import type {
	ICategoryFilters,
	ICategoryOptions,
	TCategorySortField,
} from "./category.interface";

const getCategories = async (
	filters: ICategoryFilters = {},
	options: ICategoryOptions = {},
) => {
	// hasChildren is a synthetic filter (not a column), keep it out of the query builder
	const { hasChildren, ...scalarFilters } = filters;

	// Default sort for categories
	if (!options.sortBy) {
		options.sortBy = "sortOrder";
		options.sortOrder = "asc";
	}

	const { where, orderBy, skip, take, page, limit } = buildPrismaQuery(
		scalarFilters as Record<string, unknown>,
		options as Record<string, unknown>,
		categorySearchableFields,
	);

	const safeOrderBy = [orderBy];
	if (options.sortBy !== "name") {
		safeOrderBy.push({ name: "asc" });
	}

	const whereClause = where as Record<string, unknown>;

	// Optional: hasChildren filter
	if (filters.hasChildren !== undefined) {
		whereClause.children = filters.hasChildren ? { some: {} } : { none: {} };
	}

	// Default: only return active categories unless explicitly filtered
	if (filters.isActive === undefined && whereClause.isActive === undefined) {
		whereClause.isActive = true;
	}

	const [data, total] = await Promise.all([
		prisma.serviceCategory.findMany({
			where,
			orderBy: safeOrderBy,
			skip,
			take,
			select: categoryPublicSelect,
		}),
		prisma.serviceCategory.count({ where }),
	]);

	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 0,
		},
	};
};

const getCategoryById = async (id: string) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
		select: {
			...categoryPublicSelect,
			children: {
				select: {
					id: true,
					name: true,
					slug: true,
					description: true,
					parentId: true,
					departmentId: true,
					baseSeverity: true,
					sortOrder: true,
					isActive: true,
				},
				orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
			},
			parent: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
		},
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	return category;
};

const getCategoryChildren = async (id: string) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	const children = await prisma.serviceCategory.findMany({
		where: {
			parentId: id,
			isActive: true,
		},
		orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			parentId: true,
			departmentId: true,
			baseSeverity: true,
			sortOrder: true,
			isActive: true,
			department: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	});

	return children;
};

const getCategoryAncestors = async (id: string) => {
	const category = await prisma.serviceCategory.findUnique({
		where: { id },
		select: { id: true, parentId: true },
	});

	if (!category) {
		throw new AppError(httpStatus.NOT_FOUND, "Category not found");
	}

	const ancestors: TAncestor[] = [];
	type TAncestor = {
		id: string;
		name: string;
		slug: string;
		parentId: string | null;
	};

	let currentId: string | null = category.parentId;

	while (currentId) {
		const parentId: string = currentId;
		const parent: TAncestor | null = await prisma.serviceCategory.findUnique({
			where: { id: parentId },
			select: { id: true, name: true, slug: true, parentId: true },
		});

		if (!parent) break;

		ancestors.unshift(parent);
		currentId = parent.parentId;
	}

	return ancestors;
};

export const CategoryService = {
	getCategories,
	getCategoryById,
	getCategoryChildren,
	getCategoryAncestors,
};
