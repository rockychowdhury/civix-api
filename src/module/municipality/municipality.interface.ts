import type { ServiceCoverageStatus } from "../../../generated/prisma/enums";

export interface ICreateMunicipality {
	name: string;
	code: string;
	countryCode?: string;
	timezone?: string;
}

export interface IUpdateMunicipality {
	name?: string;
	code?: string;
	countryCode?: string;
	timezone?: string;
	coverageStatus?: ServiceCoverageStatus;
}
