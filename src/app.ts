import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import config from "./config";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
import { apiRateLimiter } from "./middleware/rateLimiter";

import { AnalyticsRoutes } from "./module/analytics/analytics.route";
import { AssignmentRoutes } from "./module/assignment/assignment.route";
import { AttachmentRoutes } from "./module/attachments/attachment.route";
import { AuthRoutes } from "./module/auth/auth.route";
import { CategoryRoutes } from "./module/category/category.route";
import { CivicIssueRoutes } from "./module/civic-issues/civic-issue.route";
import { CloudinaryRoutes } from "./module/cloudinary/cloudinary.route";
import { CloudinaryWebhookController } from "./module/cloudinary/cloudinary.webhook";
import { DepartmentRoutes } from "./module/department/department.route";
import { FeedbackRoutes } from "./module/feedback/feedback.route";
import { LocationRoutes } from "./module/location/location.route";
import { MunicipalityRoutes } from "./module/municipality/municipality.route";
import { NotificationRoutes } from "./module/notification/notification.route";
import { PermissionRoutes } from "./module/permission/permission.route";
import { QueueRoutes } from "./module/queue/queue.route";
import { ResolutionRoutes } from "./module/resolutions/resolution.route";
import { RoadRoutes } from "./module/road/road.route";
import { RoleRoutes } from "./module/role/role.route";
import { ServiceRequestRoutes } from "./module/service-requests/service-request.route";
import { SlaPolicyRoutes } from "./module/sla-policy/sla-policy.route";
import { StaffRoutes } from "./module/staff/staff.route";
import { TeamRoutes } from "./module/team/team.route";
import { UserRoutes } from "./module/user/user.route";
import { WardRoutes } from "./module/ward/ward.route";
import { WorkOrderRoutes } from "./module/work-orders/work-order.route";
import { ZoneRoutes } from "./module/zone/zone.route";

const app: Application = express();

// Trust reverse proxies (Vercel, Render, AWS ALB, NGINX)
app.set("trust proxy", 1);

// Configure dynamic CORS origins
const allowedOrigins = [
	"https://civix-issue.vercel.app",
	"http://localhost:3000",
	"http://localhost:3001",
	"http://localhost:5173",
];

if (config.frontend_url) {
	const customOrigins = config.frontend_url
		.split(",")
		.map((url) => url.trim().replace(/\/$/, ""))
		.filter(Boolean);
	for (const url of customOrigins) {
		if (!allowedOrigins.includes(url)) {
			allowedOrigins.push(url);
		}
	}
}

const corsOptions: cors.CorsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (mobile apps, server-to-server, curl)
		if (!origin) {
			return callback(null, true);
		}

		const cleanOrigin = origin.replace(/\/$/, "");
		const isDirectMatch = allowedOrigins.includes(cleanOrigin);
		const isVercelDomain = /^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/.test(cleanOrigin);
		const isLocalhost = /^http:\/\/localhost:\d+$/.test(cleanOrigin);

		if (isDirectMatch || isVercelDomain || isLocalhost) {
			return callback(null, true);
		}

		console.warn(`[CORS] Rejected Origin: ${origin}`);
		return callback(null, false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
	// Reflect all requested headers (e.g. Idempotency-Key, Authorization, Content-Type)
	// and explicitly allow common ones
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"Accept",
		"Origin",
		"Idempotency-Key",
		"idempotency-key",
		"Upstash-Signature",
		"upstash-signature",
		"X-CSRF-Token",
		"Access-Control-Request-Method",
		"Access-Control-Request-Headers",
	],
	exposedHeaders: ["Set-Cookie", "Idempotency-Key", "idempotency-key"],
	optionsSuccessStatus: 200,
};

// 1. CORS MUST execute first to handle OPTIONS preflight and attach headers to all responses
app.use(cors(corsOptions));

// 2. Helmet with crossOriginResourcePolicy permitting cross-origin requests
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "cross-origin" },
	}),
);

// 3. Rate limiting for API endpoints
app.use("/api/v1", apiRateLimiter);

// 4. Body and cookie parsing
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Webhooks
const cloudinaryWebhookRouter = Router();
cloudinaryWebhookRouter.post("/", CloudinaryWebhookController.handleWebhook);
app.use("/api/v1/cloudinary-webhooks", cloudinaryWebhookRouter);

// Application routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/roles", RoleRoutes);
app.use("/api/v1/permissions", PermissionRoutes);
app.use("/api/v1/municipalities", MunicipalityRoutes);
app.use("/api/v1/categories", CategoryRoutes);
app.use("/api/v1/zones", ZoneRoutes);
app.use("/api/v1/wards", WardRoutes);
app.use("/api/v1/roads", RoadRoutes);
app.use("/api/v1/locations", LocationRoutes);
app.use("/api/v1/service-requests", ServiceRequestRoutes);
app.use("/api/v1/civic-issues", CivicIssueRoutes);
app.use("/api/v1/work-orders", WorkOrderRoutes);
app.use("/api/v1/assignments", AssignmentRoutes);
app.use("/api/v1/resolutions", ResolutionRoutes);
app.use("/api/v1/feedback", FeedbackRoutes);
app.use("/api/v1/attachments", AttachmentRoutes);
app.use("/api/v1/cloudinary", CloudinaryRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/staff", StaffRoutes);
app.use("/api/v1/teams", TeamRoutes);
app.use("/api/v1/sla-policies", SlaPolicyRoutes);
app.use("/api/v1/departments", DepartmentRoutes);
app.use("/api/v1/queue", QueueRoutes);

app.get("/test", async (_req: Request, res: Response, next: NextFunction) => {
	try {
		res.status(httpStatus.OK).json({
			success: true,
			message: "Welcome to Civix Backend",
			data: null,
		});
	} catch (error) {
		next(error);
	}
});

// Root route
app.get("/", async (_req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Civix Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
