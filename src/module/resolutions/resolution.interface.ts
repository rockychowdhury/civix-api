export interface ISubmitResolutionPayload {
	summary: string;
	attachmentIds?: string[];
}

export interface IVerifyResolutionPayload {
	status: "VERIFIED" | "REJECTED";
	notes?: string;
}
