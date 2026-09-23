export interface ISubmitResolutionPayload {
	summary: string;
}

export interface IVerifyResolutionPayload {
	status: "VERIFIED" | "REJECTED";
	notes?: string;
}
