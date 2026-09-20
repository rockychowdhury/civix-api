import { prisma } from "../../lib/prisma";
import { IssuePriority } from "../../../generated/prisma/enums";

// ─── Default SLA Policies ────────────────────────────────────
// Response SLA = how fast a department must acknowledge/assign.
// Resolution SLA = how fast the issue must be fully resolved.
// These vary by category and priority.

interface SlaPolicyDefinition {
	categorySlug: string;
	priority: IssuePriority;
	responseMinutes: number;
	resolutionMinutes: number;
}

const SLA_POLICIES: SlaPolicyDefinition[] = [
	// ─── Street Lighting (exposed wire = critical) ────────
	{
		categorySlug: "exposed-wire",
		priority: IssuePriority.EMERGENCY,
		responseMinutes: 60,
		resolutionMinutes: 360,
	},
	{
		categorySlug: "light-not-working",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 4320,
	},
	{
		categorySlug: "damaged-pole",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 4320,
	},
	{
		categorySlug: "flickering-light",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 4320,
	},

	// ─── Water Supply ─────────────────────────────────────
	{
		categorySlug: "pipe-burst",
		priority: IssuePriority.EMERGENCY,
		responseMinutes: 60,
		resolutionMinutes: 360,
	},
	{
		categorySlug: "water-leakage",
		priority: IssuePriority.HIGH,
		responseMinutes: 240,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "water-quality",
		priority: IssuePriority.HIGH,
		responseMinutes: 240,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "supply-interruption",
		priority: IssuePriority.HIGH,
		responseMinutes: 240,
		resolutionMinutes: 720,
	},

	// ─── Road & Infrastructure ────────────────────────────
	{
		categorySlug: "pothole",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 4320,
	},
	{
		categorySlug: "damaged-road",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 4320,
	},
	{
		categorySlug: "broken-sidewalk",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 10080,
	},
	{
		categorySlug: "traffic-signal-malfunction",
		priority: IssuePriority.EMERGENCY,
		responseMinutes: 60,
		resolutionMinutes: 360,
	},
	{
		categorySlug: "road-sign-damage",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 10080,
	},

	// ─── Waste Management ─────────────────────────────────
	{
		categorySlug: "garbage-overflow",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "illegal-dumping",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 2880,
	},
	{
		categorySlug: "missed-collection",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "bulk-waste-pickup",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 4320,
	},

	// ─── Drainage & Sewerage ──────────────────────────────
	{
		categorySlug: "blocked-drain",
		priority: IssuePriority.HIGH,
		responseMinutes: 240,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "waterlogging",
		priority: IssuePriority.HIGH,
		responseMinutes: 240,
		resolutionMinutes: 1440,
	},
	{
		categorySlug: "sewer-overflow",
		priority: IssuePriority.EMERGENCY,
		responseMinutes: 120,
		resolutionMinutes: 720,
	},
	{
		categorySlug: "drain-damage",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 4320,
	},

	// ─── Parks & Public Spaces ────────────────────────────
	{
		categorySlug: "park-maintenance",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 10080,
	},
	{
		categorySlug: "tree-trimming",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 10080,
	},
	{
		categorySlug: "playground-damage",
		priority: IssuePriority.MEDIUM,
		responseMinutes: 720,
		resolutionMinutes: 4320,
	},
	{
		categorySlug: "public-space-cleanliness",
		priority: IssuePriority.LOW,
		responseMinutes: 1440,
		resolutionMinutes: 4320,
	},
];

// ─── Seed Function ───────────────────────────────────────────

export const seedSlaPolicies = async (municipalityId: string) => {
	console.log("  → Seeding SLA policies...");

	// Load categories to map slug → id
	const categories = await prisma.serviceCategory.findMany();
	const catMap = new Map(categories.map((c) => [c.slug, c.id]));

	let created = 0;
	let skipped = 0;

	for (const policy of SLA_POLICIES) {
		const categoryId = catMap.get(policy.categorySlug);
		if (!categoryId) {
			console.log(
				`    ⚠ Category "${policy.categorySlug}" not found, skipping SLA`,
			);
			skipped++;
			continue;
		}

		// Check if an active policy already exists for this combo
		const existing = await prisma.slaPolicy.findFirst({
			where: {
				municipalityId,
				categoryId,
				priority: policy.priority,
				effectiveTo: null, // still active
			},
		});

		if (!existing) {
			await prisma.slaPolicy.create({
				data: {
					municipalityId,
					categoryId,
					priority: policy.priority,
					responseMinutes: policy.responseMinutes,
					resolutionMinutes: policy.resolutionMinutes,
				},
			});
			created++;
		}
	}

	console.log(
		`    ✓ ${created} SLA policies created, ${SLA_POLICIES.length - created - skipped} already existed`,
	);
	if (skipped > 0) console.log(`    ⚠ ${skipped} skipped (missing categories)`);
};
