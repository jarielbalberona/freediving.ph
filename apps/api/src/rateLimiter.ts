import { Express } from "express";
import rateLimit from "express-rate-limit";

export default function appRateLimiter(app: Express) {
	// Rate limit all requests
	const limiter = rateLimit({
		windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
		max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
		message: "Too many requests, please try again later."
	});

	// Apply to all requests to the server
	app.use(limiter);
}

export const createFeatureRateLimiter = (options: {
	windowMs: number;
	max: number;
	message: string;
}) =>
	rateLimit({
		windowMs: options.windowMs,
		max: options.max,
		message: options.message
	});
