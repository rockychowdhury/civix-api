export interface ICreateServiceRequestPayload {
	request: {
		description: string;
		categoryId?: string; // Optional: auto-detected by LLM if not supplied
	};
	location: {
		latitude?: number;
		longitude?: number;
		address: string;
		landmark?: string;
		postalCode?: string;
		wardId: string;       // Mandatory
		roadId: string;       // Mandatory
		zoneId?: string;
		municipalityId: string; // Mandatory
	};
}
