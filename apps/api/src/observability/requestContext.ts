import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const incomingRequestId = req.header("x-request-id");
	const requestId = incomingRequestId && incomingRequestId.trim().length > 0 ? incomingRequestId : randomUUID();

	req.requestId = requestId;
	res.setHeader("x-request-id", requestId);
	res.locals.requestStartedAt = Date.now();
	next();
};
