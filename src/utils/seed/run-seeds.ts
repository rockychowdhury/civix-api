import { prisma } from "../../lib/prisma";
import { seedInitialData } from "./index";

const runSeeds = async () => {
	console.log("Starting Manual Database Seeding...");
	await seedInitialData();
	console.log("Database Seeding Finished.");
	await prisma.$disconnect();
};

runSeeds().catch((e) => {
	console.error(e);
	prisma.$disconnect();
	process.exit(1);
});
