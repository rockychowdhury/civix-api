import { prisma } from "../../lib/prisma";

// ─── Departments ─────────────────────────────────────────────
// Core municipal departments. Each department handles specific
// service categories and operates within assigned service areas.

interface DepartmentDefinition {
	code: string;
	name: string;
	description: string;
}

const DEPARTMENTS: DepartmentDefinition[] = [
	{
		code: "ROADS",
		name: "Roads & Infrastructure",
		description:
			"Road maintenance, pothole repair, sidewalk damage, road signs, traffic signals",
	},
	{
		code: "WASTE",
		name: "Waste Management",
		description:
			"Garbage collection, illegal dumping, waste overflow, bulk waste pickup",
	},
	{
		code: "DRAINAGE",
		name: "Drainage & Sewerage",
		description:
			"Blocked drains, waterlogging, sewer overflow, drainage maintenance",
	},
	{
		code: "LIGHTING",
		name: "Street Lighting",
		description:
			"Streetlight repair, damaged poles, exposed wires, flickering lights",
	},
	{
		code: "WATER",
		name: "Water Supply",
		description:
			"Water leakage, pipe burst, water quality, supply interruption",
	},
	{
		code: "PARKS",
		name: "Parks & Public Spaces",
		description:
			"Park maintenance, tree trimming, playground equipment, public space cleanliness",
	},
];

// ─── Seed Function ───────────────────────────────────────────

export const seedDepartments = async (municipalityId: string) => {
	console.log("  → Seeding departments...");

	let created = 0;

	for (const dept of DEPARTMENTS) {
		const existing = await prisma.department.findUnique({
			where: { municipalityId_code: { municipalityId, code: dept.code } },
		});

		if (!existing) {
			await prisma.department.create({
				data: {
					municipalityId,
					code: dept.code,
					name: dept.name,
					description: dept.description,
				},
			});
			created++;
		}
	}

	console.log(
		`    ✓ ${created} departments created, ${DEPARTMENTS.length - created} already existed`,
	);
};
