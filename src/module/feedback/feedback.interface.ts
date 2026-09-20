export interface ICreateFeedbackPayload {
	serviceRequestId: string;
	rating: number; // 1 to 5
	comment?: string;
}
