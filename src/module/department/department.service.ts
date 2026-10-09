import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateDepartmentPayload,
	IUpdateDepartmentPayload,
} from "./department.interface";

const createDepartment = async (payload: ICreateDepartmentPayload) => {
	const exists = await prisma.department.findFirst({
		where: { municipalityId: payload.municipalityId, code: payload.code },
	});
	if (exists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Department code already exists in this municipality",
		);
	}

	return prisma.department.create({
		data: payload,
	});
};

const getDepartments = async (municipalityId?: string) => {
	const where = municipalityId ? { municipalityId } : {};
	return prisma.department.findMany({
		where,
		include: {
			municipality: { select: { name: true } },
		},
		orderBy: { name: "asc" },
	});
};

const getDepartmentById = async (id: string) => {
	const dept = await prisma.department.findUnique({
		where: { id },
		include: {
			serviceAreas: {
				include: { ward: true },
				where: { effectiveTo: null },
			},
			serviceCategories: {
				where: { isActive: true },
			},
		},
	});
	if (!dept) throw new AppError(httpStatus.NOT_FOUND, "Department not found");
	return dept;
};

const updateDepartment = async (
	id: string,
	payload: IUpdateDepartmentPayload,
) => {
	const dept = await prisma.department.findUnique({ where: { id } });
	if (!dept) throw new AppError(httpStatus.NOT_FOUND, "Department not found");

	return prisma.department.update({
		where: { id },
		data: payload,
	});
};

const addServiceArea = async (departmentId: string, wardId: string) => {
	const exists = await prisma.departmentServiceArea.findUnique({
		where: { departmentId_wardId: { departmentId, wardId } },
	});

	if (exists && !exists.effectiveTo) {
		throw new AppError(httpStatus.CONFLICT, "Service area already active");
	}

	if (exists && exists.effectiveTo) {
		return prisma.departmentServiceArea.update({
			where: { id: exists.id },
			data: { effectiveTo: null },
		});
	}

	return prisma.departmentServiceArea.create({
		data: { departmentId, wardId },
	});
};

const removeServiceArea = async (departmentId: string, areaId: string) => {
	return prisma.departmentServiceArea.update({
		where: { id: areaId, departmentId },
		data: { effectiveTo: new Date() },
	});
};

export const DepartmentService = {
	createDepartment,
	getDepartments,
	getDepartmentById,
	updateDepartment,
	addServiceArea,
	removeServiceArea,
};
