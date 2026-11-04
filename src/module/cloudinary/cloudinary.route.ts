import { Router } from "express";
import { CloudinaryController } from "./cloudinary.controller";

const router = Router();

// Get signed upload parameters for client-side direct upload
router.get("/params/:idempotencyKey", CloudinaryController.getCloudinaryOptions);

export const CloudinaryRoutes = router;