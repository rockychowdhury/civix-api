import rateLimit from "express-rate-limit";

// Limit repeated requests to public APIs and/or endpoints like login/OTP
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
	message:
		"Too many authentication attempts from this IP, please try again after 15 minutes",
	standardHeaders: true,
	legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 1000 requests per window
	message: "Too many requests from this IP, please try again after 15 minutes",
	standardHeaders: true,
	legacyHeaders: false,
});
