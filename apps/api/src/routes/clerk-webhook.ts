import express, { Router } from "express";
import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import db from "@/databases/drizzle/connection";
import { users } from "@/models/drizzle/authentication.model";
import { ApiResponse } from "@/utils/serviceApi";

const router = Router();

// Clerk webhook endpoint
router.post("/clerk-webhook", express.raw({ type: "application/json" }), async (req, res) => {
	const apiResponse = new ApiResponse(res);

	try {
		const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
		const payloadBody =
			Buffer.isBuffer(req.body) || req.body instanceof Uint8Array
				? Buffer.from(req.body).toString("utf8")
				: JSON.stringify(req.body);
		const payload = await webhook.verify(payloadBody, req.headers as any);

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

		const existing = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.clerkId, id))
			.limit(1);

		const user = existing[0];
		if (!user) return;

		await db
			.update(users)
			.set({
				accountStatus: "DELETED",
				name: null,
				username: `deleted-user-${user.id}`,
				alias: `deleted_${user.id}`,
				email: null,
				emailVerified: null,
				image: null,
				bio: null,
				location: null,
				phone: null,
				website: null,
				homeDiveArea: null,
				experienceLevel: null,
				buddyFinderVisibility: "HIDDEN",
				visibility: "MEMBERS_ONLY"
			})
			.where(eq(users.id, user.id));

		console.log(`User deleted: ${id}`);
	} catch (error) {
		console.error("Error deleting user:", error);
	}
}

export default router;
