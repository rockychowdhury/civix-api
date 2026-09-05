import { prisma } from "../../lib/prisma";
import { seedRolesAndPermissions } from "./seedRolesAndPermissions";
import { seedSuperAdmin } from "./seedSuperAdmin";

const runSeeds = async () => {
	console.log("Starting Database Seeding...");
	await seedRolesAndPermissions();
	await seedSuperAdmin();
	console.log("Database Seeding Finished.");
	await prisma.$disconnect();
};

runSeeds().catch((e) => {
	console.error(e);
	prisma.$disconnect();
	process.exit(1);
});

