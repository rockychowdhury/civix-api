import { file } from "zod";
import { LifecycleStatus } from "../../../generated/prisma/enums";
import { id } from "zod/locales";
import { title } from "process";
import { from } from "stream/iter";

export interface ICreateServiceRequestPayload {
	request: {
		title: string;
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

/* requested payload 
payload = {
request: {
  title: string;
  description: string;
  categoryId: string; 
},
location: {
  latitude: Float;
  longitude: Float;
  address: String;
  landmark: String;
  postalCode: String;
  wardId: String;
  zoneId: String;
  municipalityId: String;
}
  attachments: {
    file: file;
  }[];
}

*/
