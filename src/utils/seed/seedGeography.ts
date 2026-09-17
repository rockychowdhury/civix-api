import { prisma } from "../../lib/prisma";

// ─── Default Municipality ────────────────────────────────────
// A single city to start. The schema supports multi-tenancy,
// but the seed creates one operational municipality.

const DEFAULT_MUNICIPALITY = {
	code: "DHAKA-NORTH",
	name: "Dhaka North City Corporation",
	countryCode: "BD",
	timezone: "Asia/Dhaka",
};

// ─── Zones & Wards ───────────────────────────────────────────
// Dhaka North has 10 zones, each containing wards.
// We seed a representative subset — enough to demonstrate
// routing, filtering, and department service areas.

interface ZoneDefinition {
	name: string;
	wards: { name: string; number: string }[];
}

const ZONES: ZoneDefinition[] = [
	{
		name: "Zone 1",
		wards: [
			{ name: "Ward 1", number: "1" },
			{ name: "Ward 2", number: "2" },
			{ name: "Ward 3", number: "3" },
		],
	},
	{
		name: "Zone 2",
		wards: [
			{ name: "Ward 4", number: "4" },
			{ name: "Ward 5", number: "5" },
			{ name: "Ward 6", number: "6" },
		],
	},
	{
		name: "Zone 3",
		wards: [
			{ name: "Ward 7", number: "7" },
			{ name: "Ward 8", number: "8" },
			{ name: "Ward 9", number: "9" },
		],
	},
	{
		name: "Zone 4",
		wards: [
			{ name: "Ward 10", number: "10" },
			{ name: "Ward 11", number: "11" },
			{ name: "Ward 12", number: "12" },
		],
	},
	{
		name: "Zone 5",
		wards: [
			{ name: "Ward 13", number: "13" },
			{ name: "Ward 14", number: "14" },
			{ name: "Ward 15", number: "15" },
		],
	},
];

// ─── Seed Function ───────────────────────────────────────────

export const seedGeography = async () => {
	console.log("  → Seeding municipality, zones, and wards...");

	// Upsert municipality
	const municipality = await prisma.municipality.upsert({
		where: { code: DEFAULT_MUNICIPALITY.code },
		update: {
			name: DEFAULT_MUNICIPALITY.name,
			countryCode: DEFAULT_MUNICIPALITY.countryCode,
			timezone: DEFAULT_MUNICIPALITY.timezone,
		},
		create: DEFAULT_MUNICIPALITY,
	});
	console.log(`    ✓ Municipality: ${municipality.name}`);

	let zoneCount = 0;
	let wardCount = 0;

	for (const zoneDef of ZONES) {
		// Find or create zone — no unique constraint on name alone,
		// so we find by name + municipalityId
		let zone = await prisma.zone.findFirst({
			where: { name: zoneDef.name, municipalityId: municipality.id },
		});

		if (!zone) {
			zone = await prisma.zone.create({
				data: {
					name: zoneDef.name,
					municipalityId: municipality.id,
				},
			});
			zoneCount++;
		}

		for (const wardDef of zoneDef.wards) {
			// Wards have @@unique([number, zoneId])
			const existing = await prisma.ward.findUnique({
				where: { number_zoneId: { number: wardDef.number, zoneId: zone.id } },
			});

			if (!existing) {
				await prisma.ward.create({
					data: {
						name: wardDef.name,
						number: wardDef.number,
						zoneId: zone.id,
					},
				});
				wardCount++;
			}
		}
	}

	console.log(
		`    ✓ ${zoneCount} zones created, ${ZONES.length - zoneCount} already existed`,
	);
	console.log(`    ✓ ${wardCount} wards created`);

	return municipality;
};
