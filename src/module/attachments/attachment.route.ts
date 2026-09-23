import { Router } from "express";
import { AttachmentController } from "./attachment.controller";
import { upload } from "../../middleware/fileUpload";
import { requirePermission } from "../../middleware/checkAuth";
import { Action, Resource } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/service-request/:id",
	requirePermission(Action.CREATE, Resource.SERVICE_REQUEST),
	upload.array("files", 3),
	AttachmentController.uploadForServiceRequest,
);

router.post(
	"/work-update/:id",
	requirePermission(Action.CREATE, Resource.WORK_ORDER),
	upload.array("files", 3),
	AttachmentController.uploadForWorkUpdate,
);

router.get(
	"/:id",
	requirePermission(Action.READ, Resource.ATTACHMENT),
	AttachmentController.getAttachmentById,
);

router.delete(
	"/:id",
	requirePermission(Action.DELETE, Resource.ATTACHMENT),
	AttachmentController.deleteAttachment,
);

export const AttachmentRoutes = router;
