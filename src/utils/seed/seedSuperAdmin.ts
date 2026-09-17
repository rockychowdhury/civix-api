import bcrypt from "bcryptjs";
import config from "../../config";
import { prisma } from "../../lib/prisma";

export const seedSuperAdmin = async () => {
	console.log("  → Seeding super admin...");

	const superAdminRole = await prisma.role.findUnique({
		where: { code: "SUPER_ADMIN" },
	});

	if (!superAdminRole) {
		console.log(
			"    ⚠ SUPER_ADMIN role not found. Run seedRolesAndPermissions first. Skipping.",
		);
		return;
	}

	// Check if any user already has the SUPER_ADMIN role
	const existingSuperAdmin = await prisma.user.findFirst({
		where: {
			userRoles: {
				some: { roleId: superAdminRole.id },
			},
		},
	});

	if (existingSuperAdmin) {
		console.log(
			`    ✓ Super admin already exists (${existingSuperAdmin.email})`,
		);
		return;
	}

	const name = config.super_admin_name;
	const email = config.super_admin_email;
	const password = config.super_admin_password;

	if (!name || !email || !password) {
		console.log(
			"    ⚠ SUPER_ADMIN_NAME/EMAIL/PASSWORD missing in .env. Skipping.",
		);
		return;
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	const firstName = name.split(" ")[0] || "Super";
	const lastName = name.split(" ").slice(1).join(" ") || "Admin";

	const superAdmin = await prisma.user.create({
		data: {
			email,
			passwordHash: hashedPassword,
			displayName: `${firstName} ${lastName}`,
			isEmailVerified: true,
			status: "ACTIVE",
			staffProfile: {
				create: {
					firstName,
					lastName,
					employeeId: "SA-0001",
					designation: "Super Administrator",
				},
			},
			userRoles: {
				create: {
					roleId: superAdminRole.id,
				},
			},
		},
	});

	console.log(`    ✓ Super admin created (${superAdmin.email})`);
};
