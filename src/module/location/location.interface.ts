export interface ICreateLocation {
	latitude?: number;
	longitude?: number;
	address: string;
	landmark?: string;
	postalCode?: string;
	wardId?: string;
	zoneId?: string;
	municipalityId?: string;
}

export interface IUpdateLocation {
	latitude?: number;
	longitude?: number;
	address?: string;
	landmark?: string;
	postalCode?: string;
	wardId?: string;
	zoneId?: string;
	municipalityId?: string;
}
