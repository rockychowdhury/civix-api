import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { Request, Response } from "express";
import { generateSignedUploadParams } from "./cloudinary.service";

interface CloudinaryOptionsResponse {
  options: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId?: string;
  };
}

const getCloudinaryOptions = catchAsync(async (req: Request, res: Response) => {
  const { idempotencyKey } = req.params;
  const rawBucket = (req.query.bucket as string) || (req.query.folder as string) || "service-requests";
  
  // Sanitize folder path
  const sanitizedBucket = rawBucket.replace(/[^a-zA-Z0-9_-]/g, "");
  const folder = `civix/${sanitizedBucket}`;

  // Unique publicId tagged with idempotency key and timestamp
  const publicId = `civix-${idempotencyKey}-${Date.now()}`;

  // Generate signed upload parameters
  const params = await generateSignedUploadParams(
    idempotencyKey as string,
    folder,
    publicId,
  );

  const response: CloudinaryOptionsResponse = {
    options: {
      cloudName: params.cloudName,
      apiKey: params.apiKey,
      timestamp: params.timestamp,
      signature: params.signature,
      folder: params.folder,
      publicId: params.publicId,
    },
  };

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Cloudinary upload parameters retrieved successfully",
    data: response,
  });
});

export const CloudinaryController = {
  getCloudinaryOptions,
};
