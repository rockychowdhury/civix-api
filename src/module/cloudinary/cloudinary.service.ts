import { cloudinary } from "../../lib/cloudinary";
import { redisClient } from "../../lib/redis";

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

export async function generateSignedUploadParams(
  idempotencyKey: string,
  folder: string,
  publicId?: string,
): Promise<SignedUploadParams> {
  const timestamp = Math.floor(Date.now() / 1000);
  const apiKey = cloudinary.config().api_key as string;
  const cloudName = cloudinary.config().cloud_name as string;

  const toSign: Record<string, any> = {
    folder,
    timestamp,
  };
  if (publicId) {
    toSign.public_id = publicId;
  }

  const signature = cloudinary.utils.api_sign_request(
    toSign,
    cloudinary.config().api_secret as string,
  );

  // Cache signature in Redis for fast validation lookup
  try {
    await redisClient.setEx(
      `cloudinary-upload:${idempotencyKey}`,
      600, // 10 minutes TTL
      JSON.stringify({ signature, folder, validated: false }),
    );
  } catch (error) {
    console.warn("Failed to store upload signature in Redis:", error);
  }

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
  };
}

export interface UploadNotification {
  type: "resource.uploaded" | "async:task";
  payload: {
    public_id: string;
    timestamp?: number;
    secure_url?: string;
    bytes?: number;
  };
}

export interface UploadOptions {
  folder: string;
  publicId?: string;
  transformations?: string[];
}

export interface PublicIdInfo {
  type: string;
  version: number;
  format: string;
  extension: string;
  resourceType: "image" | "raw" | "video";
}
