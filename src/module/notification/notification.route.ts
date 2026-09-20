import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { requireAuth } from "../../middleware/checkAuth";

const router = Router();

// In-app notifications are available to any authenticated user (Citizens or Staff)
router.get("/", requireAuth, NotificationController.getMyNotifications);

router.patch(
	"/mark-all-read",
	requireAuth,
	NotificationController.markAllAsRead,
);

router.patch("/:id/read", requireAuth, NotificationController.markAsRead);

export const NotificationRoutes = router;
