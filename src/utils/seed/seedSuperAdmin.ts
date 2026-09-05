import bcrypt from "bcryptjs";
import config from "../../config";
import { prisma } from "../../lib/prisma";

export const seedSuperAdmin = async () => {
	try {
		console.log("Seeding Super Admin...");
		
		const superAdminRole = await prisma.role.findUnique({
			where: { name: "SUPER_ADMIN" }
		});

		if (!superAdminRole) {
			console.log("SUPER_ADMIN role not found. Skipping super admin seed.");
			return;
		}

		const isSuperAdminExist = await prisma.user.findFirst({
			where: {
				userRoles: {
					some: {
						roleId: superAdminRole.id
					}
				}
			},
		});

		if (isSuperAdminExist) {
			console.log("Super Admin Already Exists!");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			console.error("Super Admin Name, Email, Password Missing In Env File!!! Skipping.");
			return;
		}

		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds) || 10,
		);

		const superAdmin = await prisma.user.create({
			data: {
				email,
				passwordHash: hashedPassword,
				isEmailVerified: true,
				status: "ACTIVE",
				staffProfile: {
					create: {
						firstName: name.split(" ")[0] || "Super",
						lastName: name.split(" ").slice(1).join(" ") || "Admin",
						employeeId: "SA-0001",
					}
				},
				userRoles: {
					create: {
						roleId: superAdminRole.id
					}
				}
			},
		});

		console.log("Super Admin Created Successfully:", superAdmin.email);
	} catch (error) {
		console.error("Error Seeding Super Admin:", error);
		
		// Attempt rollback
		try {
			await prisma.user.delete({
				where: { email: config.super_admin_email },
			});
		} catch (deleteError) {
			// ignore if it doesn't exist
		}
	}
};

