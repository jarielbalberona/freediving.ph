import { Express, NextFunction, Request, Response } from "express";
import pino from "pino";

export const createLogger = (name: string) => {
	return pino({
		name,
		level: process.env.LOG_LEVEL || "info",
		transport:
			process.env.NODE_ENV !== "production"
				? {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "HH:MM:ss",
							ignore: "pid,hostname"
						}
					}
				: undefined
	});
};

export type Logger = ReturnType<typeof createLogger>;

const logger = createLogger("api");

export { logger };

export default function appLogger(app: Express) {
	app.use((req: Request, res: Response, next: NextFunction) => {
		const start = Date.now();
		logger.info({ event: "request_start", requestId: req.requestId ?? null, method: req.method, url: req.url });

		res.on("finish", () => {
			const duration = Date.now() - start;
			const logData = {
				event: "request_finish",
				requestId: req.requestId ?? null,
				method: req.method,
				url: req.url,
				statusCode: res.statusCode,
				durationMs: duration
			};
			if (res.statusCode >= 500) {
				logger.error(logData);
			} else {
				logger.info(logData);
			}
		});
		next();
	});
}
