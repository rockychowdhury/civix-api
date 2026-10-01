export interface ICategoryFilters {
	searchTerm?: string;
	departmentId?: string;
	parentId?: string;
	isActive?: boolean;
	hasChildren?: boolean;
}

export interface ICategoryOptions {
	page?: number | string;
	limit?: number | string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export type TCategorySortField =
	| "name"
	| "slug"
	| "sortOrder"
	| "baseSeverity"
	| "createdAt"
	| "updatedAt";
