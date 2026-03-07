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
	explore: {
		totalRequests: number;
		totalErrors: number;
		averageDurationMs: number;
		p95DurationMs: number;
		routeStats: Record<
			string,
			{
				totalRequests: number;
				totalErrors: number;
				averageDurationMs: number;
				p95DurationMs: number;
			}
		>;
	};
};

const state = {
	totalRequests: 0,
	inFlightRequests: 0,
	totalErrors: 0,
	totalDurationMs: 0,
	statusCounts: {} as Record<string, number>,
	exploreRouteStats: {} as Record<
		string,
		{
			totalRequests: number;
			totalErrors: number;
			totalDurationMs: number;
			durationsMs: number[];
		}
	>
};

const getExploreRouteKey = (req: Request) => {
	const path = req.path || "";
	if (path.startsWith("/dive-spots")) return "dive-spots";
	if (path.startsWith("/records") || path.startsWith("/competitive-records")) return "records";
	if (path.startsWith("/events") && req.query?.diveSpotId) return "events-by-dive-spot";
	if (path.startsWith("/buddies/available") && req.query?.diveSpotId) return "buddies-by-dive-spot";
	return null;
};

const computeP95 = (durationsMs: number[]) => {
	if (durationsMs.length === 0) return 0;
	const sorted = [...durationsMs].sort((a, b) => a - b);
	const index = Math.ceil(sorted.length * 0.95) - 1;
	return sorted[Math.max(0, index)] ?? 0;
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
	state.totalRequests += 1;
	state.inFlightRequests += 1;
	const startedAt = Date.now();
	const exploreRouteKey = getExploreRouteKey(req);

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

		if (exploreRouteKey) {
			const routeState =
				state.exploreRouteStats[exploreRouteKey] ??
				(state.exploreRouteStats[exploreRouteKey] = {
					totalRequests: 0,
					totalErrors: 0,
					totalDurationMs: 0,
					durationsMs: []
				});

			routeState.totalRequests += 1;
			routeState.totalDurationMs += durationMs;
			routeState.durationsMs.push(durationMs);
			if (routeState.durationsMs.length > 5000) {
				routeState.durationsMs.shift();
			}

			if (statusCode >= 500) {
				routeState.totalErrors += 1;
			}
		}
	});

	next();
};

export const getMetricsSnapshot = (): MetricSnapshot => {
	const routeEntries = Object.entries(state.exploreRouteStats);
	const totalExploreRequests = routeEntries.reduce((sum, [, route]) => sum + route.totalRequests, 0);
	const totalExploreErrors = routeEntries.reduce((sum, [, route]) => sum + route.totalErrors, 0);
	const totalExploreDurationMs = routeEntries.reduce((sum, [, route]) => sum + route.totalDurationMs, 0);
	const mergedDurations = routeEntries.flatMap(([, route]) => route.durationsMs);

	return {
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
		},
		explore: {
			totalRequests: totalExploreRequests,
			totalErrors: totalExploreErrors,
			averageDurationMs:
				totalExploreRequests > 0 ? Number((totalExploreDurationMs / totalExploreRequests).toFixed(2)) : 0,
			p95DurationMs: Number(computeP95(mergedDurations).toFixed(2)),
			routeStats: Object.fromEntries(
				routeEntries.map(([routeKey, routeState]) => [
					routeKey,
					{
						totalRequests: routeState.totalRequests,
						totalErrors: routeState.totalErrors,
						averageDurationMs:
							routeState.totalRequests > 0
								? Number((routeState.totalDurationMs / routeState.totalRequests).toFixed(2))
								: 0,
						p95DurationMs: Number(computeP95(routeState.durationsMs).toFixed(2))
					}
				])
			)
		}
	};
};
