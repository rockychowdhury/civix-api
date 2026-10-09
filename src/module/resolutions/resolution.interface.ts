export interface ISubmitResolutionPayload {
	summary: string;
}

export interface IVerifyResolutionPayload {
	status: "VERIFIED" | "REJECTED" | "REOPENED";
	notes?: string;
}
