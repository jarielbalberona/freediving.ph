import { Router, type Request, type Response } from "express";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Webhook } from "svix";

import db from "@/databases/drizzle/connection";
import { appUsers } from "@/models/drizzle/rbac.model";

const router = Router();

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    primary_email_address_id?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
  };
}

const getDisplayName = (data: ClerkWebhookPayload["data"]): string | null => {
  const combined = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  if (combined.length > 0) {
    return combined;
  }

  return data.username ?? null;
};

const getEmail = (data: ClerkWebhookPayload["data"]): string | null => {
  if (!data.primary_email_address_id || !data.email_addresses?.length) {
    return null;
  }

  const primary = data.email_addresses.find(
    (email) => email.id === data.primary_email_address_id
  );

  return primary?.email_address ?? null;
};

const verifyWebhook = async (req: Request): Promise<ClerkWebhookPayload> => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body);
  const webhook = new Webhook(secret);
  const payload = (await webhook.verify(body, req.headers as Record<string, string>)) as ClerkWebhookPayload;
  return payload;
};

const handleUserCreated = async (data: ClerkWebhookPayload["data"]): Promise<void> => {
  const email = getEmail(data);
  const displayName = getDisplayName(data);

  await db
    .insert(appUsers)
    .values({
      clerkUserId: data.id,
      email,
      displayName,
      globalRole: "member",
      status: "active"
    })
    .onConflictDoUpdate({
      target: appUsers.clerkUserId,
      set: {
        email,
        displayName,
        status: "active",
        updatedAt: sql`now()`
      }
    });
};

const handleUserUpdated = async (data: ClerkWebhookPayload["data"]): Promise<void> => {
  const email = getEmail(data);
  const displayName = getDisplayName(data);

  await db
    .update(appUsers)
    .set({
      email,
      displayName,
      updatedAt: sql`now()`
    })
    .where(eq(appUsers.clerkUserId, data.id));
};

const handleUserDeleted = async (data: ClerkWebhookPayload["data"]): Promise<void> => {
  await db
    .update(appUsers)
    .set({
      clerkUserId: sql`concat('deleted:', ${appUsers.id}::text)`,
      status: "read_only",
      email: null,
      displayName: "Deleted user",
      updatedAt: sql`now()`
    })
    .where(and(eq(appUsers.clerkUserId, data.id), isNotNull(appUsers.clerkUserId)));
};

export const handleClerkWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = await verifyWebhook(req);

    if (payload.type === "user.created") {
      await handleUserCreated(payload.data);
    }

    if (payload.type === "user.updated") {
      await handleUserUpdated(payload.data);
    }

    if (payload.type === "user.deleted") {
      await handleUserDeleted(payload.data);
    }

    res.status(200).json({ status: 200, message: "Webhook processed" });
  } catch {
    res.status(400).json({ status: 400, message: "Invalid webhook signature" });
  }
};

router.post("/clerk", async (req, res) => {
  await handleClerkWebhook(req, res);
});

export default router;
