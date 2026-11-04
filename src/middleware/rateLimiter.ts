import rateLimit from "express-rate-limit";

// Limit repeated requests to public APIs and/or endpoints like login/OTP
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Limit each IP to 50 requests per 15 minutes (avoid locking out users/testers)
	skip: (req) => req.method === "OPTIONS",
	message:
		"Too many authentication attempts from this IP, please try again after 15 minutes",
	standardHeaders: true,
	legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 1000 requests per window
	skip: (req) => req.method === "OPTIONS",
	message: "Too many requests from this IP, please try again after 15 minutes",
	standardHeaders: true,
	legacyHeaders: false,
});

