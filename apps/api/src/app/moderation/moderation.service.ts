import { and, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { auditLogs, threadModerationStates, userFeatureRestrictions } from "@/models/drizzle/moderation.model";
import { chikaPseudonyms } from "@/models/drizzle/chika.model";
import { comments, threads } from "@/models/drizzle/threads.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
	ModerateFeatureRestrictionSchemaType,
	ModerateThreadActionSchemaType,
	ModerateUserSuspensionSchemaType
} from "./moderation.validators";

export default class ModerationService extends DrizzleService {
	async lockThread(actorUserId: number, threadId: number, payload: ModerateThreadActionSchemaType) {
		try {
			const exists = await this.db.select({ id: threads.id }).from(threads).where(eq(threads.id, threadId)).limit(1);
			if (!exists[0]) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			const existingState = await this.db
				.select({ id: threadModerationStates.id })
				.from(threadModerationStates)
				.where(eq(threadModerationStates.threadId, threadId))
				.limit(1);

			const values = {
				state: "LOCKED" as const,
				reasonCode: payload.reasonCode,
				note: payload.note ?? null,
				actedByUserId: actorUserId
			};

			if (existingState[0]) {
				await this.db.update(threadModerationStates).set(values).where(eq(threadModerationStates.threadId, threadId));
			} else {
				await this.db.insert(threadModerationStates).values({ threadId, ...values });
			}

			await this.db.insert(auditLogs).values({
				actorUserId,
				action: "THREAD_LOCKED",
				targetType: "THREAD",
				targetId: String(threadId),
				metadata: values
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Thread locked", { threadId });
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeThread(actorUserId: number, threadId: number, payload: ModerateThreadActionSchemaType) {
		try {
			const updatedThread = await this.db
				.update(threads)
				.set({
					title: "[removed by moderator]",
					content: "[removed by moderator]"
				})
				.where(eq(threads.id, threadId))
				.returning({ id: threads.id });

			if (!updatedThread[0]) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			await this.db
				.update(comments)
				.set({ content: "[removed by moderator]" })
				.where(eq(comments.threadId, threadId));

			const existingState = await this.db
				.select({ id: threadModerationStates.id })
				.from(threadModerationStates)
				.where(eq(threadModerationStates.threadId, threadId))
				.limit(1);

			const values = {
				state: "REMOVED" as const,
				reasonCode: payload.reasonCode,
				note: payload.note ?? null,
				actedByUserId: actorUserId
			};
			if (existingState[0]) {
				await this.db.update(threadModerationStates).set(values).where(eq(threadModerationStates.threadId, threadId));
			} else {
				await this.db.insert(threadModerationStates).values({ threadId, ...values });
			}

			await this.db.insert(auditLogs).values({
				actorUserId,
				action: "THREAD_REMOVED",
				targetType: "THREAD",
				targetId: String(threadId),
				metadata: values
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Thread removed by moderator", { threadId });
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async setUserSuspension(actorUserId: number, userId: number, payload: ModerateUserSuspensionSchemaType) {
		try {
			const nextStatus = payload.action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
			const updated = await this.db
				.update(users)
				.set({ accountStatus: nextStatus })
				.where(eq(users.id, userId))
				.returning({ id: users.id, accountStatus: users.accountStatus });

			if (!updated[0]) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "User not found");
			}

			await this.db.insert(auditLogs).values({
				actorUserId,
				action: payload.action === "SUSPEND" ? "USER_SUSPENDED" : "USER_REACTIVATED",
				targetType: "USER",
				targetId: String(userId),
				metadata: {
					reasonCode: payload.reasonCode ?? null,
					note: payload.note ?? null
				}
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "User status updated", updated[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async setFeatureRestriction(actorUserId: number, userId: number, payload: ModerateFeatureRestrictionSchemaType) {
		try {
			const existing = await this.db
				.select({ id: userFeatureRestrictions.id })
				.from(userFeatureRestrictions)
				.where(
					and(
						eq(userFeatureRestrictions.userId, userId),
						eq(userFeatureRestrictions.restrictionType, payload.restrictionType)
					)
				)
				.limit(1);

			const values = {
				userId,
				restrictionType: payload.restrictionType,
				isActive: payload.isActive ? 1 : 0,
				reasonCode: payload.reasonCode ?? null,
				note: payload.note ?? null,
				actedByUserId: actorUserId
			};

			if (existing[0]) {
				await this.db
					.update(userFeatureRestrictions)
					.set(values)
					.where(eq(userFeatureRestrictions.id, existing[0].id));
			} else {
				await this.db.insert(userFeatureRestrictions).values(values);
			}

			await this.db.insert(auditLogs).values({
				actorUserId,
				action: "USER_FEATURE_RESTRICTION_UPDATED",
				targetType: "USER",
				targetId: String(userId),
				metadata: values
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "User feature restriction updated", values);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async revealThreadPseudonyms(threadId: number) {
		try {
			const rows = await this.db
				.select({
					id: chikaPseudonyms.id,
					threadId: chikaPseudonyms.threadId,
					userId: chikaPseudonyms.userId,
					displayHandle: chikaPseudonyms.displayHandle,
					user: {
						id: users.id,
						username: users.username,
						alias: users.alias,
						email: users.email
					}
				})
				.from(chikaPseudonyms)
				.leftJoin(users, eq(chikaPseudonyms.userId, users.id))
				.where(eq(chikaPseudonyms.threadId, threadId));

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Thread pseudonyms revealed for moderation", rows);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
