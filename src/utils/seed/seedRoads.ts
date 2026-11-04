import { prisma } from "../../lib/prisma";

const COMMON_ROADS = [
	{ name: "Main Avenue", roadNumber: "01" },
	{ name: "Central Street", roadNumber: "02" },
	{ name: "Park Road", roadNumber: "03" },
	{ name: "Station Road", roadNumber: "04" },
	{ name: "Lakeview Road", roadNumber: "05" },
	{ name: "College Road", roadNumber: "06" },
	{ name: "Hospital Lane", roadNumber: "07" },
	{ name: "Commercial Street", roadNumber: "08" },
];

export const seedRoads = async () => {
	console.log("Seeding roads for wards...");
	const wards = await prisma.ward.findMany();

	let count = 0;
	for (const ward of wards) {
		for (const roadDef of COMMON_ROADS) {
			const roadName = `${ward.name} - ${roadDef.name}`;
			const existing = await prisma.road.findUnique({
				where: {
					name_wardId: {
						name: roadName,
						wardId: ward.id,
					},
				},
			});

			if (!existing) {
				await prisma.road.create({
					data: {
						name: roadName,
						roadNumber: `${ward.number}-${roadDef.roadNumber}`,
						wardId: ward.id,
						isActive: true,
					},
				});
				count++;
			}
		}
	}

	console.log(`Successfully seeded ${count} roads.`);
};

