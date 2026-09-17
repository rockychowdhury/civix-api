import { prisma } from "../lib/prisma";

interface AuditLogPayload {
	userId?: string;
	action: string;
	resource: string;
	resourceId?: string;
	oldValue?: any;
	newValue?: any;
	metadata?: any;
	ipAddress?: string;
	tx?: any; // Prisma transaction client
}

export const createAuditLog = async (payload: AuditLogPayload) => {
	const { tx, oldValue, newValue, metadata, ...rest } = payload;
	const db = tx || prisma;

	return await db.auditLog.create({
		data: {
			...rest,
			oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
			newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
			metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
		},
	});
};
