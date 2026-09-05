import { prisma } from "../../lib/prisma";

const roles = [
	"CITIZEN",
	"STAFF",
	"TECHNICIAN",
	"DEPARTMENT_MANAGER",
	"CITY_ADMIN",
	"PLATFORM_ADMIN",
	"SUPER_ADMIN"
];

const permissions = [
	{ action: "create", resource: "service_request" },
	{ action: "read", resource: "service_request" },
	{ action: "update", resource: "service_request" },
	{ action: "delete", resource: "service_request" },
	{ action: "manage", resource: "all" },
];

export const seedRolesAndPermissions = async () => {
	try {
		console.log("Seeding Roles...");
		for (const roleName of roles) {
			await prisma.role.upsert({
				where: { name: roleName },
				update: {},
				create: { name: roleName },
			});
		}

		console.log("Seeding Permissions...");
		for (const perm of permissions) {
			await prisma.permission.upsert({
				where: {
					action_resource: {
						action: perm.action,
						resource: perm.resource,
					}
				},
				update: {},
				create: perm,
			});
		}

		console.log("Assigning Permissions to SUPER_ADMIN...");
		const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
		const manageAllPerm = await prisma.permission.findUnique({
			where: { action_resource: { action: "manage", resource: "all" } }
		});

		if (superAdminRole && manageAllPerm) {
			await prisma.rolePermission.upsert({
				where: {
					roleId_permissionId: {
						roleId: superAdminRole.id,
						permissionId: manageAllPerm.id,
					}
				},
				update: {},
				create: {
					roleId: superAdminRole.id,
					permissionId: manageAllPerm.id,
				}
			});
		}

		console.log("Roles and Permissions Seeded Successfully.");
	} catch (error) {
		console.error("Error seeding roles and permissions:", error);
	}
};

