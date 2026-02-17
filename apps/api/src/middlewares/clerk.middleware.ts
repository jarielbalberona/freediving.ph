import { NextFunction, Request, Response } from "express";
import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import db from "@/databases/drizzle/connection";
import { users } from "@/models/drizzle/authentication.model";
import { ApiResponse } from "@/utils/serviceApi";
import { hasMinimumPlatformRole, type PlatformRole } from "@/core/authorization";
import { canPerformPolicyAction, type PolicyAction } from "@/core/policies";

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: any;
		}
	}
}

export const clerkAuthMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
const apiResponse = new ApiResponse(res);

try {
		// Get token from Authorization header
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			apiResponse.unauthorizedResponse("No token provided");
			return;
		}

		const token = authHeader.substring(7); // Remove 'Bearer ' prefix

		// Verify the Clerk JWT token
		const payload = await verifyToken(token, {
			secretKey: process.env.CLERK_SECRET_KEY!
		});

		// Get user from database using Clerk ID
		const user = await db
			.select()
			.from(users)
			.where(eq(users.clerkId, payload.sub))
			.limit(1);

		if (!user || user.length === 0) {
			apiResponse.unauthorizedResponse("User not found");
			return;
		}

		if (user[0].accountStatus !== "ACTIVE") {
			apiResponse.forbiddenResponse("Account is not active");
			return;
		}

		// Attach user to request
		req.user = user[0];
		next();
	} catch (error) {
		console.error("Clerk auth middleware error:", error);
		apiResponse.unauthorizedResponse("Invalid token");
		return;
	}
};

export const optionalClerkAuthMiddleware = async (
	req: Request,
	_res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			next();
			return;
		}

		const token = authHeader.substring(7);
		const payload = await verifyToken(token, {
			secretKey: process.env.CLERK_SECRET_KEY!
		});

		const user = await db
			.select()
			.from(users)
			.where(eq(users.clerkId, payload.sub))
			.limit(1);

		if (user?.[0] && user[0].accountStatus === "ACTIVE") {
			req.user = user[0];
		}

		next();
		return;
	} catch {
		next();
		return;
	}
};

// Optional: Middleware to check if user has specific role
export const requireRole = (role: string) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const apiResponse = new ApiResponse(res);

		if (!req.user) {
			apiResponse.unauthorizedResponse("User not authenticated");
			return;
		}

		if (req.user.role !== role && req.user.role !== 'SUPER_ADMIN') {
			apiResponse.forbiddenResponse("Insufficient permissions");
			return;
		}

		next();
	};
};

export const requireAnyRole = (roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const apiResponse = new ApiResponse(res);

		if (!req.user) {
			apiResponse.unauthorizedResponse("User not authenticated");
			return;
		}

		if (!roles.includes(req.user.role)) {
			apiResponse.forbiddenResponse("Insufficient permissions");
			return;
		}

		next();
	};
};

export const requirePlatformRole = (role: PlatformRole) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const apiResponse = new ApiResponse(res);

		if (!req.user) {
			apiResponse.unauthorizedResponse("User not authenticated");
			return;
		}

		if (!hasMinimumPlatformRole(req.user.role, role)) {
			apiResponse.forbiddenResponse("Insufficient permissions");
			return;
		}

		next();
	};
};

export const requirePolicy = (action: PolicyAction) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const apiResponse = new ApiResponse(res);

		if (!req.user) {
			apiResponse.unauthorizedResponse("User not authenticated");
			return;
		}

		if (!canPerformPolicyAction(req.user.role, action)) {
			apiResponse.forbiddenResponse("Insufficient permissions");
			return;
		}

		next();
	};
};
