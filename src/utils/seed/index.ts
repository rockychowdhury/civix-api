export * from "./seedRolesAndPermissions";
export * from "./seedSuperAdmin";
export * from "./seedGeography";
export * from "./seedDepartments";
export * from "./seedServiceCategories";
export * from "./seedSlaPolicies";

import { seedRolesAndPermissions } from "./seedRolesAndPermissions";
import { seedSuperAdmin } from "./seedSuperAdmin";
import { seedGeography } from "./seedGeography";
import { seedDepartments } from "./seedDepartments";
import { seedServiceCategories } from "./seedServiceCategories";
import { seedSlaPolicies } from "./seedSlaPolicies";

export const seedInitialData = async () => {
	console.log("Starting Initial Data Seeding...");

	try {
		// 1. Foundation: Roles & Admin
		await seedRolesAndPermissions();
		await seedSuperAdmin();

		// 2. Geography: Required for all locations
		const municipality = await seedGeography();

		// 3. Organization: Departments & Categories
		await seedDepartments(municipality.id);
		await seedServiceCategories(municipality.id);

		// 4. Operations: SLA Policies
		await seedSlaPolicies(municipality.id);

		console.log("Initial Data Seeding Completed Successfully.");
	} catch (error) {
		console.error("Error during initial data seeding:", error);
		// Don't throw - allow server to start even if seed fails (might be duplicate constraints etc)
	}
};
