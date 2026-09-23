import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type NextFunction,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
import { AuthRoutes } from "./module/auth/auth.route";
import { UserRoutes } from "./module/user/user.route";
import helmet from "helmet";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimiter";

const app: Application = express();

app.set("trust proxy", 1);

// Security Middleware
app.use(helmet());
app.use("/api/v1/auth", authRateLimiter);
app.use("/api/v1", apiRateLimiter);

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware to parse JSON bodies
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

import { RoleRoutes } from "./module/role/role.route";
import { PermissionRoutes } from "./module/permission/permission.route";
import { MunicipalityRoutes } from "./module/municipality/municipality.route";
import { ZoneRoutes } from "./module/zone/zone.route";
import { WardRoutes } from "./module/ward/ward.route";
import { LocationRoutes } from "./module/location/location.route";
import { ServiceRequestRoutes } from "./module/service-requests/service-request.route";
import { CivicIssueRoutes } from "./module/civic-issues/civic-issue.route";
import { WorkOrderRoutes } from "./module/work-orders/work-order.route";
import { AssignmentRoutes } from "./module/assignment/assignment.route";
import { ResolutionRoutes } from "./module/resolutions/resolution.route";
import { FeedbackRoutes } from "./module/feedback/feedback.route";
import { AttachmentRoutes } from "./module/attachments/attachment.route";
import { AnalyticsRoutes } from "./module/analytics/analytics.route";
import { NotificationRoutes } from "./module/notification/notification.route";
import { StaffRoutes } from "./module/staff/staff.route";
import { TeamRoutes } from "./module/team/team.route";

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/roles", RoleRoutes);
app.use("/api/v1/permissions", PermissionRoutes);

app.use("/api/v1/municipalities", MunicipalityRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/wards", WardRoutes);
app.use("/api/v1/locations", LocationRoutes);
app.use("/api/v1/service-requests", ServiceRequestRoutes);
app.use("/api/v1/civic-issues", CivicIssueRoutes);
app.use("/api/v1/work-orders", WorkOrderRoutes);
app.use("/api/v1/assignments", AssignmentRoutes);
app.use("/api/v1/resolutions", ResolutionRoutes);
app.use("/api/v1/feedback", FeedbackRoutes);
app.use("/api/v1/attachments", AttachmentRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/staff", StaffRoutes);
app.use("/api/v1/teams", TeamRoutes);

app.get("/test", async (req: Request, res: Response, next: NextFunction) => {
	try {
		res.status(httpStatus.OK).json({
			success: true,
			message: "Welcome to Civix Backend",
			data: null,
		});
	} catch (error) {
		console.log(error);
		next(error);
	}
});

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Civix Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
