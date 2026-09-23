import { file } from "zod";
import { LifecycleStatus } from "../../../generated/prisma/enums";
import { id } from "zod/locales";
import { title } from "process";
import { from } from "stream/iter";

export interface ICreateServiceRequestPayload {
	request: {
		description: string;
		categoryId: string;
	};
	location: {
		latitude?: number;
		longitude?: number;
		address: string;
		landmark?: string;
		postalCode?: string;
		wardId?: string;
		zoneId?: string;
		municipalityId: string;
	};
}

