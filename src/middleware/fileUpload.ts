import multer from "multer";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";

// Configure memory storage for Cloudinary streaming
const storage = multer.memoryStorage();

// Basic filter to ensure only images/documents are uploaded
const fileFilter = (
	req: any,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback,
) => {
	const allowedMimeTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
	];

	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new AppError(
				httpStatus.BAD_REQUEST,
				"Unsupported file format. Please upload JPEG, PNG, or WEBP images only.",
			),
		);
	}
};

export const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
	},
	fileFilter,
});
