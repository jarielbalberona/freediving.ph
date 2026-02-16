import { Router } from "express";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";
import { eq } from "drizzle-orm";
import db from "@/databases/drizzle/connection";
import { users } from "@/models/drizzle/authentication.model";
import { ApiResponse } from "@/utils/serviceApi";

const router = Router();

// Get current user
router.get("/me", clerkAuthMiddleware, (req, res) => {
	const apiResponse = new ApiResponse(res);

	try {
		// Remove sensitive data
		const { password, ...userWithoutPassword } = req.user;
		apiResponse.successResponse("User retrieved successfully", userWithoutPassword);
	} catch (error) {
		console.error("Get user error:", error);
		apiResponse.internalServerError("Failed to get user");
	}
});

// Update user profile
router.put("/profile", clerkAuthMiddleware, async (req, res) => {
	const apiResponse = new ApiResponse(res);

	try {
		const { name, username, alias } = req.body;

		// Check if username is already taken by another user
		if (username) {
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.username, username))
				.limit(1);

			if (existingUser.length > 0 && existingUser[0].id !== req.user.id) {
				apiResponse.badResponse("Username already taken");
				return;
			}
		}

		// Check if alias is already taken by another user
		if (alias) {
			const existingAlias = await db
				.select()
				.from(users)
				.where(eq(users.alias, alias))
				.limit(1);

			if (existingAlias.length > 0 && existingAlias[0].id !== req.user.id) {
				apiResponse.badResponse("Alias already taken");
				return;
			}
		}

		const updatedUser = await db
			.update(users)
			.set({
				name: name || req.user.name,
				username: username || req.user.username,
				alias: alias || req.user.alias,
			})
			.where(eq(users.id, req.user.id))
			.returning();

		apiResponse.successResponse("Profile updated successfully", updatedUser[0]);
	} catch (error) {
		console.error("Update profile error:", error);
		apiResponse.internalServerError("Failed to update profile");
	}
});

// Get user by ID (public profile)
router.get("/:id", async (req, res) => {
	const apiResponse = new ApiResponse(res);

	try {
		const userId = parseInt(req.params.id);

		if (isNaN(userId)) {
			apiResponse.badResponse("Invalid user ID");
			return;
		}

		const user = await db
			.select({
				id: users.id,
				name: users.name,
				username: users.username,
				alias: users.alias,
				image: users.image,
				role: users.role,
				createdAt: users.createdAt,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!user || user.length === 0) {
			apiResponse.badResponse("User not found");
			return;
		}

		apiResponse.successResponse("User retrieved successfully", user[0]);
	} catch (error) {
		console.error("Get user by ID error:", error);
		apiResponse.internalServerError("Failed to get user");
	}
});

export { router as authRouter };
