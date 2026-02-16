import { Router } from "express";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import db from "@/databases/drizzle/connection";
import { users } from "@/models/drizzle/authentication.model";
import { ApiResponse } from "@/utils/serviceApi";

const router = Router();

// Clerk webhook endpoint
router.post("/clerk-webhook", async (req, res) => {
	const apiResponse = new ApiResponse(res);

	try {
		const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
		const payload = await webhook.verify(req.body, req.headers as any);

		const { type, data } = payload as { type: string; data: any };

		switch (type) {
			case "user.created":
				await handleUserCreated(data);
				break;
			case "user.updated":
				await handleUserUpdated(data);
				break;
			case "user.deleted":
				await handleUserDeleted(data);
				break;
			default:
				console.log(`Unhandled webhook event: ${type}`);
		}

		apiResponse.successResponse("Webhook processed successfully");
	} catch (error) {
		console.error("Webhook error:", error);
		apiResponse.badResponse("Invalid webhook signature");
	}
});

async function handleUserCreated(userData: any) {
	try {
		const { id, first_name, last_name, username, email_addresses, image_url, created_at } = userData;

		// Get primary email
		const primaryEmail = email_addresses?.find((email: any) => email.id === userData.primary_email_address_id);

		await db.insert(users).values({
			clerkId: id,
			name: `${first_name || ''} ${last_name || ''}`.trim() || null,
			username: username || null,
			email: primaryEmail?.email_address || null,
			emailVerified: primaryEmail?.verification?.status === 'verified' ? new Date() : null,
			image: image_url || null,
			role: "USER"
		});

		console.log(`User created: ${id}`);
	} catch (error) {
		console.error("Error creating user:", error);
	}
}

async function handleUserUpdated(userData: any) {
	try {
		const { id, first_name, last_name, username, email_addresses, image_url } = userData;

		// Get primary email
		const primaryEmail = email_addresses?.find((email: any) => email.id === userData.primary_email_address_id);

		await db
			.update(users)
			.set({
				name: `${first_name || ''} ${last_name || ''}`.trim() || null,
				username: username || null,
				email: primaryEmail?.email_address || null,
				emailVerified: primaryEmail?.verification?.status === 'verified' ? new Date() : null,
				image: image_url || null,
			})
			.where(eq(users.clerkId, id));

		console.log(`User updated: ${id}`);
	} catch (error) {
		console.error("Error updating user:", error);
	}
}

async function handleUserDeleted(userData: any) {
	try {
		const { id } = userData;

		await db
			.delete(users)
			.where(eq(users.clerkId, id));

		console.log(`User deleted: ${id}`);
	} catch (error) {
		console.error("Error deleting user:", error);
	}
}

export default router;
