import { Router } from "express";
import { AttachmentController } from "./attachment.controller";
import { upload } from "../../middleware/fileUpload";
import { requireAuth } from "../../middleware/checkAuth";

const router = Router();

router.post(
	"/service-request/:id",
	requireAuth,
	upload.array("files", 3),
	AttachmentController.uploadForServiceRequest,
);

router.post(
	"/work-update/:id",
	requireAuth,
	upload.array("files", 3),
	AttachmentController.uploadForWorkUpdate,
);

router.get("/:id", requireAuth, AttachmentController.getAttachmentById);

export const AttachmentRoutes = router;
