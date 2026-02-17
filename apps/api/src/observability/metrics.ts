import { NextFunction, Request, Response } from "express";

type MetricSnapshot = {
	process: {
		uptimeSeconds: number;
		memoryRssBytes: number;
	};
	http: {
		totalRequests: number;
		inFlightRequests: number;
		totalErrors: number;
		statusCounts: Record<string, number>;
		averageDurationMs: number;
	};
};

const state = {
	totalRequests: 0,
	inFlightRequests: 0,
	totalErrors: 0,
	totalDurationMs: 0,
	statusCounts: {} as Record<string, number>
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
	state.totalRequests += 1;
	state.inFlightRequests += 1;
	const startedAt = Date.now();

	res.on("finish", () => {
		state.inFlightRequests = Math.max(0, state.inFlightRequests - 1);
		const durationMs = Date.now() - startedAt;
		state.totalDurationMs += durationMs;

		const statusCode = res.statusCode;
		if (statusCode >= 500) {
			state.totalErrors += 1;
		}

		const statusKey = String(statusCode);
		state.statusCounts[statusKey] = (state.statusCounts[statusKey] || 0) + 1;
	});

	next();
};

export const getMetricsSnapshot = (): MetricSnapshot => ({
	process: {
		uptimeSeconds: Math.floor(process.uptime()),
		memoryRssBytes: process.memoryUsage().rss
	},
	http: {
		totalRequests: state.totalRequests,
		inFlightRequests: state.inFlightRequests,
		totalErrors: state.totalErrors,
		statusCounts: state.statusCounts,
		averageDurationMs: state.totalRequests > 0 ? Number((state.totalDurationMs / state.totalRequests).toFixed(2)) : 0
	}
});
