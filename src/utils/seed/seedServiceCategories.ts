import { prisma } from "../../lib/prisma";

// ─── Service Categories ──────────────────────────────────────
// Hierarchical category tree. Top-level categories map to
// departments. Child categories are the specific issue types
// citizens will see during triage.

interface CategoryDefinition {
	slug: string;
	name: string;
	departmentCode: string;
	children: { slug: string; name: string }[];
}

const CATEGORIES: CategoryDefinition[] = [
	{
		slug: "road-infrastructure",
		name: "Road & Infrastructure",
		departmentCode: "ROADS",
		children: [
			{ slug: "pothole", name: "Pothole" },
			{ slug: "damaged-road", name: "Damaged Road" },
			{ slug: "broken-sidewalk", name: "Broken Sidewalk" },
			{ slug: "road-sign-damage", name: "Road Sign Damage" },
			{
				slug: "traffic-signal-malfunction",
				name: "Traffic Signal Malfunction",
			},
		],
	},
	{
		slug: "waste-management",
		name: "Waste Management",
		departmentCode: "WASTE",
		children: [
			{ slug: "garbage-overflow", name: "Garbage Overflow" },
			{ slug: "illegal-dumping", name: "Illegal Dumping" },
			{ slug: "missed-collection", name: "Missed Collection" },
			{ slug: "bulk-waste-pickup", name: "Bulk Waste Pickup Request" },
		],
	},
	{
		slug: "drainage-sewerage",
		name: "Drainage & Sewerage",
		departmentCode: "DRAINAGE",
		children: [
			{ slug: "blocked-drain", name: "Blocked Drain" },
			{ slug: "waterlogging", name: "Waterlogging" },
			{ slug: "sewer-overflow", name: "Sewer Overflow" },
			{ slug: "drain-damage", name: "Drain Damage" },
		],
	},
	{
		slug: "street-lighting",
		name: "Street Lighting",
		departmentCode: "LIGHTING",
		children: [
			{ slug: "light-not-working", name: "Light Not Working" },
			{ slug: "damaged-pole", name: "Damaged Pole" },
			{ slug: "exposed-wire", name: "Exposed Wire" },
			{ slug: "flickering-light", name: "Flickering Light" },
		],
	},
	{
		slug: "water-supply",
		name: "Water Supply",
		departmentCode: "WATER",
		children: [
			{ slug: "water-leakage", name: "Water Leakage" },
			{ slug: "pipe-burst", name: "Pipe Burst" },
			{ slug: "water-quality", name: "Water Quality Issue" },
			{ slug: "supply-interruption", name: "Supply Interruption" },
		],
	},
	{
		slug: "parks-public-spaces",
		name: "Parks & Public Spaces",
		departmentCode: "PARKS",
		children: [
			{ slug: "park-maintenance", name: "Park Maintenance" },
			{ slug: "tree-trimming", name: "Tree Trimming Request" },
			{ slug: "playground-damage", name: "Playground Equipment Damage" },
			{ slug: "public-space-cleanliness", name: "Public Space Cleanliness" },
		],
	},
];

// ─── Seed Function ───────────────────────────────────────────

export const seedServiceCategories = async (municipalityId: string) => {
	console.log("  → Seeding service categories...");

	// Load departments for this municipality to link categories
	const departments = await prisma.department.findMany({
		where: { municipalityId },
	});
	const deptMap = new Map(departments.map((d) => [d.code, d.id]));

	let parentCount = 0;
	let childCount = 0;

	for (const catDef of CATEGORIES) {
		const departmentId = deptMap.get(catDef.departmentCode) ?? null;

		// Upsert parent category
		const parent = await prisma.serviceCategory.upsert({
			where: { slug: catDef.slug },
			update: { name: catDef.name, departmentId },
			create: {
				slug: catDef.slug,
				name: catDef.name,
				departmentId,
				sortOrder: parentCount,
			},
		});
		parentCount++;

		// Upsert child categories
		for (let i = 0; i < catDef.children.length; i++) {
			const child = catDef.children[i]!;
			await prisma.serviceCategory.upsert({
				where: { slug: child.slug },
				update: { name: child.name, parentId: parent.id, departmentId },
				create: {
					slug: child.slug,
					name: child.name,
					parentId: parent.id,
					departmentId,
					sortOrder: i,
				},
			});
			childCount++;
		}
	}

	console.log(
		`    ✓ ${parentCount} parent categories, ${childCount} child categories upserted`,
	);
};
