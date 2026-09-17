import { prisma } from "../../lib/prisma";
import { Action, Resource } from "../../../generated/prisma/enums";

// ─── System Roles ────────────────────────────────────────────

interface RoleDefinition {
	code: string;
	name: string;
	description: string;
}

const SYSTEM_ROLES: RoleDefinition[] = [
	{
		code: "CITIZEN",
		name: "Citizen",
		description:
			"Registered citizen who can submit service requests and track issues",
	},
	{
		code: "DISPATCHER",
		name: "Dispatcher",
		description:
			"Department staff who reviews, triages, and routes incoming requests",
	},
	{
		code: "TECHNICIAN",
		name: "Technician",
		description:
			"Field worker who accepts assignments and performs on-site work",
	},
	{
		code: "DEPARTMENT_MANAGER",
		name: "Department Manager",
		description: "Manages department staff, monitors SLA, approves resolutions",
	},
	{
		code: "CITY_ADMIN",
		name: "City Admin",
		description:
			"City-wide administration — manages departments, wards, categories, SLA policies",
	},
	{
		code: "PLATFORM_ADMIN",
		name: "Platform Admin",
		description:
			"Platform-level operations — manages municipalities, system config",
	},
	{
		code: "SUPER_ADMIN",
		name: "Super Admin",
		description: "Full system access — all permissions on all resources",
	},
];

// ─── Permission Matrix ───────────────────────────────────────
// Maps each role to its allowed action-resource pairs.
// SUPER_ADMIN gets MANAGE:ALL (wildcard). Others get explicit grants.

type PermissionGrant = { action: Action; resource: Resource };

const ROLE_PERMISSIONS: Record<string, PermissionGrant[]> = {
	SUPER_ADMIN: [{ action: Action.MANAGE, resource: Resource.ALL }],

	PLATFORM_ADMIN: [
		{ action: Action.MANAGE, resource: Resource.MUNICIPALITY },
		{ action: Action.MANAGE, resource: Resource.DEPARTMENT },
		{ action: Action.MANAGE, resource: Resource.CATEGORY },
		{ action: Action.MANAGE, resource: Resource.ZONE },
		{ action: Action.MANAGE, resource: Resource.WARD },
		{ action: Action.MANAGE, resource: Resource.SLA_POLICY },
		{ action: Action.MANAGE, resource: Resource.ROLE },
		{ action: Action.MANAGE, resource: Resource.PERMISSION },
		{ action: Action.MANAGE, resource: Resource.USER },
		{ action: Action.READ, resource: Resource.AUDIT_LOG },
		{ action: Action.READ, resource: Resource.CIVIC_ISSUE },
		{ action: Action.READ, resource: Resource.SERVICE_REQUEST },
	],

	CITY_ADMIN: [
		{ action: Action.MANAGE, resource: Resource.DEPARTMENT },
		{ action: Action.MANAGE, resource: Resource.CATEGORY },
		{ action: Action.MANAGE, resource: Resource.ZONE },
		{ action: Action.MANAGE, resource: Resource.WARD },
		{ action: Action.MANAGE, resource: Resource.SLA_POLICY },
		{ action: Action.MANAGE, resource: Resource.STAFF },
		{ action: Action.MANAGE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.MANAGE, resource: Resource.SERVICE_REQUEST },
		{ action: Action.MANAGE, resource: Resource.ESCALATION },
		{ action: Action.READ, resource: Resource.AUDIT_LOG },
		{ action: Action.READ, resource: Resource.NOTIFICATION },
	],

	DEPARTMENT_MANAGER: [
		{ action: Action.READ, resource: Resource.CIVIC_ISSUE },
		{ action: Action.UPDATE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.CLOSE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.REOPEN, resource: Resource.CIVIC_ISSUE },
		{ action: Action.MERGE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.READ, resource: Resource.SERVICE_REQUEST },
		{ action: Action.MANAGE, resource: Resource.WORK_ORDER },
		{ action: Action.ASSIGN, resource: Resource.ASSIGNMENT },
		{ action: Action.REASSIGN, resource: Resource.ASSIGNMENT },
		{ action: Action.APPROVE, resource: Resource.RESOLUTION },
		{ action: Action.READ, resource: Resource.RESOLUTION },
		{ action: Action.READ, resource: Resource.FEEDBACK },
		{ action: Action.MANAGE, resource: Resource.ESCALATION },
		{ action: Action.MANAGE, resource: Resource.STAFF },
		{ action: Action.READ, resource: Resource.AUDIT_LOG },
		{ action: Action.READ, resource: Resource.NOTIFICATION },
	],

	DISPATCHER: [
		{ action: Action.READ, resource: Resource.CIVIC_ISSUE },
		{ action: Action.UPDATE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.MERGE, resource: Resource.CIVIC_ISSUE },
		{ action: Action.READ, resource: Resource.SERVICE_REQUEST },
		{ action: Action.UPDATE, resource: Resource.SERVICE_REQUEST },
		{ action: Action.CREATE, resource: Resource.WORK_ORDER },
		{ action: Action.READ, resource: Resource.WORK_ORDER },
		{ action: Action.UPDATE, resource: Resource.WORK_ORDER },
		{ action: Action.ASSIGN, resource: Resource.ASSIGNMENT },
		{ action: Action.REASSIGN, resource: Resource.ASSIGNMENT },
		{ action: Action.READ, resource: Resource.ASSIGNMENT },
		{ action: Action.READ, resource: Resource.RESOLUTION },
		{ action: Action.VERIFY, resource: Resource.RESOLUTION },
		{ action: Action.ESCALATE, resource: Resource.ESCALATION },
		{ action: Action.READ, resource: Resource.NOTIFICATION },
		{ action: Action.READ, resource: Resource.LOCATION },
		{ action: Action.READ, resource: Resource.ATTACHMENT },
	],

	TECHNICIAN: [
		{ action: Action.READ, resource: Resource.WORK_ORDER },
		{ action: Action.UPDATE, resource: Resource.WORK_ORDER },
		{ action: Action.READ, resource: Resource.ASSIGNMENT },
		{ action: Action.UPDATE, resource: Resource.ASSIGNMENT },
		{ action: Action.CREATE, resource: Resource.RESOLUTION },
		{ action: Action.READ, resource: Resource.RESOLUTION },
		{ action: Action.CREATE, resource: Resource.ATTACHMENT },
		{ action: Action.READ, resource: Resource.ATTACHMENT },
		{ action: Action.READ, resource: Resource.NOTIFICATION },
		{ action: Action.READ, resource: Resource.CIVIC_ISSUE },
	],

	CITIZEN: [
		{ action: Action.CREATE, resource: Resource.SERVICE_REQUEST },
		{ action: Action.READ, resource: Resource.SERVICE_REQUEST },
		{ action: Action.CREATE, resource: Resource.ATTACHMENT },
		{ action: Action.READ, resource: Resource.ATTACHMENT },
		{ action: Action.CREATE, resource: Resource.FEEDBACK },
		{ action: Action.READ, resource: Resource.FEEDBACK },
		{ action: Action.READ, resource: Resource.CIVIC_ISSUE },
		{ action: Action.READ, resource: Resource.NOTIFICATION },
		{ action: Action.READ, resource: Resource.PROFILE },
		{ action: Action.UPDATE, resource: Resource.PROFILE },
		{ action: Action.REOPEN, resource: Resource.CIVIC_ISSUE },
	],
};

// ─── Seed Function ───────────────────────────────────────────

export const seedRolesAndPermissions = async () => {
	console.log("  → Seeding roles...");

	// 1. Upsert all system roles
	const roleMap = new Map<string, string>(); // code → id

	for (const roleDef of SYSTEM_ROLES) {
		const role = await prisma.role.upsert({
			where: { code: roleDef.code },
			update: { name: roleDef.name, description: roleDef.description },
			create: {
				code: roleDef.code,
				name: roleDef.name,
				description: roleDef.description,
				isSystemRole: true,
			},
		});
		roleMap.set(roleDef.code, role.id);
	}
	console.log(`    ✓ ${SYSTEM_ROLES.length} roles upserted`);

	// 2. Collect all unique permissions from the matrix
	const uniquePerms = new Map<string, PermissionGrant>();
	for (const grants of Object.values(ROLE_PERMISSIONS)) {
		for (const grant of grants) {
			const key = `${grant.action}:${grant.resource}`;
			uniquePerms.set(key, grant);
		}
	}

	// 3. Upsert all permissions
	console.log("  → Seeding permissions...");
	const permMap = new Map<string, string>(); // "action:resource" → id

	for (const [key, perm] of uniquePerms) {
		const record = await prisma.permission.upsert({
			where: {
				action_resource: { action: perm.action, resource: perm.resource },
			},
			update: {},
			create: { action: perm.action, resource: perm.resource },
		});
		permMap.set(key, record.id);
	}
	console.log(`    ✓ ${uniquePerms.size} permissions upserted`);

	// 4. Assign permissions to roles
	console.log("  → Assigning permissions to roles...");
	let assignmentCount = 0;

	for (const [roleCode, grants] of Object.entries(ROLE_PERMISSIONS)) {
		const roleId = roleMap.get(roleCode);
		if (!roleId) continue;

		for (const grant of grants) {
			const permId = permMap.get(`${grant.action}:${grant.resource}`);
			if (!permId) continue;

			await prisma.rolePermission.upsert({
				where: { roleId_permissionId: { roleId, permissionId: permId } },
				update: {},
				create: { roleId, permissionId: permId },
			});
			assignmentCount++;
		}
	}
	console.log(`    ✓ ${assignmentCount} role-permission assignments upserted`);
};
