import { v2 as Cloudinary } from "cloudinary";
import config from "../config";

Cloudinary.config({
	cloud_name: config.cloudinary_cloud_name,
	api_key: config.cloudinary_api_key,
	api_secret: config.cloudinary_api_secret,
});

export const cloudinary = Cloudinary;

export const uploadToCloudinary = async (
	fileBuffer: Buffer,
	folder: string,
): Promise<{
	url: string;
	public_id: string;
	format: string;
	size: number;
}> => {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ folder, resource_type: "image" },
			(error, result) => {
				if (error) return reject(error);
				if (result) {
					resolve({
						url: result.secure_url,
						public_id: result.public_id,
						format: result.format,
						size: result.bytes,
					});
				} else {
					reject(new Error("Unknown error during upload"));
				}
			},
		);
		uploadStream.end(fileBuffer);
	});
};

export const deleteFromCloudinary = async (
	public_id: string,
): Promise<void> => {
	await cloudinary.uploader.destroy(public_id);
};
