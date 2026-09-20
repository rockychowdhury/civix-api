import type { ServiceCoverageStatus } from "../../../generated/prisma/enums";

export interface ICreateWard {
	name: string;
	number: string;
	zoneId: string;
}

export interface IUpdateWard {
	name?: string;
	number?: string;
	zoneId?: string;
	coverageStatus?: ServiceCoverageStatus;
}
