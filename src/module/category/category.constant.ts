export const categorySearchableFields = ["name", "slug", "description"];
export const categoryFilterableFields = [
	"departmentId",
	"parentId",
	"isActive",
	"hasChildren",
];
export const categorySortableFields = [
	"name",
	"slug",
	"sortOrder",
	"baseSeverity",
	"createdAt",
	"updatedAt",
];

// Public endpoints must not leak internal technician-only fields (workInstructions).
export const categoryPublicSelect = {
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
} as const;

export const DEFAULT_CATEGORY_LIMIT = 50;
export const MAX_CATEGORY_LIMIT = 200;
