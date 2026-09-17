import { calculatePagination } from "./calculatePagination";

export const buildPrismaQuery = (
	filters: Record<string, any>,
	options: Record<string, any>,
	searchableFields: string[],
) => {
	const { searchTerm, ...filterData } = filters;
	const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

	const andConditions: any[] = [];

	// Search
	if (searchTerm) {
		andConditions.push({
			OR: searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm as string,
					mode: "insensitive",
				},
			})),
		});
	}

	// Exact Filters
	if (Object.keys(filterData).length > 0) {
		andConditions.push({
			AND: Object.keys(filterData).map((key) => ({
				[key]: {
					equals: filterData[key],
				},
			})),
		});
	}

	const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

	const orderBy = {
		[sortBy]: sortOrder,
	};

	return {
		where,
		orderBy,
		skip,
		take: limit,
		page,
		limit,
	};
};
