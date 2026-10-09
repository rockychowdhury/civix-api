export interface ICreateFeedbackPayload {
	serviceRequestId: string;
	resolutionId?: string;
	rating: number; // 1 to 5
	comment?: string;
}
