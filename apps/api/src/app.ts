import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { handleClerkWebhook } from "@/routes/clerk-webhook";
import helmet from "helmet";
import path from "path";

import { corsOptions } from "@/cors";
import analysis from "@/databases/drizzle/analysis";
import appLogger from "@/logger";
import { metricsMiddleware } from "@/observability/metrics";
import { requestContextMiddleware } from "@/observability/requestContext";
import { uploadDir } from "@/multer/globalConfig";
import appRateLimiter from "@/rateLimiter";
import indexRouter from "@/routes/index.route";
import appRouter from "@/routes/routes.config";
import { doubleCsrfProtection } from "@/utils/csrf";
import { notFoundHandler, serverErrorHandler } from "@/utils/errorHandler";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.post("/api/v1/webhooks/clerk", express.raw({ type: "application/json" }), handleClerkWebhook);
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(`/${uploadDir}`, express.static(path.join(process.cwd(), "uploads")));
app.use(requestContextMiddleware);
app.use(metricsMiddleware);

/**
 * Initialize logger
 * This will log all requests to the server
 * This is to monitor the server
 */
appLogger(app);

/**
 * Rate limiter for all requests
 * This will limit the number of requests to the server
 * This is to prevent abuse of the server
 */
appRateLimiter(app);

/**
 * Trust proxy for proper IP detection
 */
app.set("trust proxy", 1);

// Generate CSRF token for all routes
app.use(doubleCsrfProtection);

/**
 * Default route
 * This is the default route for the server
 */
indexRouter(app);

/**
 * Initialize query analysis
 * This will analyze all queries made to the database
 * This is to monitor the database
 */
analysis(app);

/**
 * Initialize all routes are handled in the api.ts file
 * Routes are mounted at root
 * Example: http://localhost:3000/auth/me
 */
appRouter(app);

/**
 * Not found handler
 * This will handle all routes that are not found
 * This is to prevent the server from crashing
 */
notFoundHandler(app);

// Store socket.io instance on app for use in routes

/**
 * Error handler
 * This will handle all errors in the server
 * This is to prevent the server from crashing
 */
serverErrorHandler(app);

export default app;
