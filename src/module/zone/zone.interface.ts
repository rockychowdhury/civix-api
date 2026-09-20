import type { ServiceCoverageStatus } from "../../../generated/prisma/enums";

export interface ICreateZone {
	name: string;
	municipalityId: string;
}

export interface IUpdateZone {
	name?: string;
	municipalityId?: string;
	coverageStatus?: ServiceCoverageStatus;
}
