import { Express, NextFunction, Request, Response } from "express";

export default function appLogger(app: Express) {
	app.use((req: Request, res: Response, next: NextFunction) => {
		const { method, url } = req;
		const start = Date.now();

		res.on("finish", () => {
			const duration = Date.now() - start;
			const logLine = {
				level: res.statusCode >= 500 ? "error" : "info",
				ts: new Date().toISOString(),
				requestId: req.requestId ?? null,
				method,
				url,
				statusCode: res.statusCode,
				durationMs: duration,
				appUserId: req.context?.appUserId ?? null,
				globalRole: req.context?.globalRole ?? null
			};

			console.log(JSON.stringify(logLine));
		});

		next();
	});
}
