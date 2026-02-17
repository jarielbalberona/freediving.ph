import { InferSelectModel, and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { ABUSE_LIMITS } from "@/core/abuseControls";
import { isModeratorDbRole } from "@/core/authorization";
import { getPlatformBlockedUserIds, isPlatformBlockedBetween } from "@/core/blocking";
import { isThreadLockedOrRemoved, isUserFeatureRestricted } from "@/core/moderationGuards";
import { ThreadsServerSchemaType, ThreadsUpdateSchemaType, CommentCreateSchemaType, ReactionSchemaType } from "@/app/threads/threads.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { threads, comments, reactions } from "@/models/drizzle/threads.model";
import { chikaPseudonyms, threadCategoryModes } from "@/models/drizzle/chika.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { buildOffsetPagination } from "@/utils/pagination";
import type { PaginationQuerySchemaType } from "@/validators/pagination.schema";

export type ThreadsSchemaType = InferSelectModel<typeof threads>;
type ThreadWithUserRow = {
	thread: InferSelectModel<typeof threads>;
	user: {
		id: number | null;
		username: string | null;
		email: string | null;
		alias: string | null;
	} | null;
	commentCount: number;
	upvotes: number;
	downvotes: number;
};
type ThreadCreateInput = ThreadsServerSchemaType & { userId: number };
type ThreadCommentInput = CommentCreateSchemaType & { userId: number };
type ReactionInput = ReactionSchemaType & { userId: number };

export default class ThreadsService extends DrizzleService {
	private isModeratorRole(role: string | null | undefined) {
		return isModeratorDbRole(role);
	}

	private buildPseudonymHandle(userId: number, threadId: number) {
		const seed = Math.abs((userId * 97 + threadId * 131) % 10000)
			.toString()
			.padStart(4, "0");
		return `Diver-${seed}`;
	}

	private async getAccountAgeHours(userId: number) {
		const userRows = await this.db
			.select({ createdAt: users.createdAt })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		const createdAt = userRows[0]?.createdAt;
		if (!createdAt) return 0;
		return (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
	}

	private async getThreadMode(threadId: number): Promise<"NORMAL" | "PSEUDONYMOUS_CHIKA"> {
		const rows = await this.db
			.select({ mode: threadCategoryModes.mode })
			.from(threadCategoryModes)
			.where(eq(threadCategoryModes.threadId, threadId))
			.limit(1);
		return rows[0]?.mode ?? "NORMAL";
	}

	private async redactThreadAuthorForPseudonymous(
		row: ThreadWithUserRow,
		isModerator: boolean
	): Promise<ThreadWithUserRow> {
		if (isModerator || !row.user) return row;
		const mode = await this.getThreadMode(row.thread.id);
		if (mode !== "PSEUDONYMOUS_CHIKA") return row;

		const pseudoRows = await this.db
			.select({ displayHandle: chikaPseudonyms.displayHandle })
			.from(chikaPseudonyms)
			.where(and(eq(chikaPseudonyms.threadId, row.thread.id), eq(chikaPseudonyms.userId, row.thread.userId)))
			.limit(1);

		return {
			...row,
			thread: {
				...row.thread,
				userId: 0
			},
			user: {
				id: 0,
				username: pseudoRows[0]?.displayHandle ?? this.buildPseudonymHandle(row.thread.userId, row.thread.id),
				email: null,
				alias: null
			}
		};
	}

	async create(data: ThreadCreateInput) {
		try {
			const isChikaDisabled = await isUserFeatureRestricted(this.db, data.userId, "CHIKA_POSTING_DISABLED");
			if (isChikaDisabled) {
				return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Chika posting is disabled for this account");
			}

			const todayStart = new Date();
			todayStart.setUTCHours(0, 0, 0, 0);

			const dailyThreadsRows = await this.db
				.select({ total: count(threads.id) })
				.from(threads)
				.where(and(eq(threads.userId, data.userId), gte(threads.createdAt, todayStart)));

			if ((dailyThreadsRows[0]?.total ?? 0) >= ABUSE_LIMITS.threadsPerDay) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_429_TOO_MANY_REQUESTS,
					`Daily thread creation limit reached (${ABUSE_LIMITS.threadsPerDay})`
				);
			}

			const createdData = await this.db.insert(threads).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid thread data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Threads created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieve(
		id: number,
		viewerUserId: number | null = null,
		viewerRole: string | null = null
	): Promise<ServiceApiResponse<ThreadWithUserRow>> {
		try {
			const retrieveData = await this.db
				.select({
					thread: threads,
					user: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias
					},
					commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
					upvotes: sql<number>`COUNT(DISTINCT CASE WHEN ${reactions.type} = '1' THEN ${reactions.id} END)`,
					downvotes: sql<number>`COUNT(DISTINCT CASE WHEN ${reactions.type} = '0' THEN ${reactions.id} END)`
				})
				.from(threads)
				.leftJoin(users, eq(threads.userId, users.id))
				.leftJoin(comments, eq(threads.id, comments.threadId))
				.leftJoin(reactions, eq(threads.id, reactions.threadId))
				.where(and(eq(threads.id, id), isNull(threads.deletedAt)))
				.groupBy(threads.id, users.id)
				.limit(1);

			if (!retrieveData.length) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			if (viewerUserId && retrieveData[0].thread.userId) {
				const blocked = await isPlatformBlockedBetween(this.db, viewerUserId, retrieveData[0].thread.userId);
				if (blocked) {
					return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
				}
			}

			const data = await this.redactThreadAuthorForPseudonymous(
				retrieveData[0],
				this.isModeratorRole(viewerRole)
			);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Thread retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}


	async update(id: number, actorUserId: number, actorRole: string, data: ThreadsUpdateSchemaType) {
		try {
			const existingRows = await this.db
				.select({ userId: threads.userId })
				.from(threads)
				.where(and(eq(threads.id, id), isNull(threads.deletedAt)))
				.limit(1);

			const existing = existingRows[0];
			if (!existing) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			if (!this.isModeratorRole(actorRole) && existing.userId !== actorUserId) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_403_FORBIDDEN,
					"Only thread owner or moderator can update this thread"
				);
			}

			const updatedData = await this.db.update(threads).set(data).where(eq(threads.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid thread id",
					updatedData[0]
				);
			}

			await this.db.insert(auditLogs).values({
				actorUserId: actorUserId,
				action: "THREAD_UPDATED",
				targetType: "THREAD",
				targetId: String(id),
				metadata: {
					isModeratorAction: this.isModeratorRole(actorRole)
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Thread updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAll(
		query: PaginationQuerySchemaType,
		viewerUserId: number | null = null,
		viewerRole: string | null = null
	) {
		try {
			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(threads)
				.where(isNull(threads.deletedAt));
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const retrieveData = await this.db
				.select({
					thread: threads,
					user: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias
					},
					commentCount: sql<number>`COUNT(DISTINCT ${comments.id})`,
					upvotes: sql<number>`COUNT(DISTINCT CASE WHEN ${reactions.type} = '1' THEN ${reactions.id} END)`,
					downvotes: sql<number>`COUNT(DISTINCT CASE WHEN ${reactions.type} = '0' THEN ${reactions.id} END)`
				})
				.from(threads)
				.leftJoin(users, eq(threads.userId, users.id))
				.leftJoin(comments, eq(threads.id, comments.threadId))
				.leftJoin(reactions, eq(threads.id, reactions.threadId))
				.where(isNull(threads.deletedAt))
				.groupBy(threads.id, users.id)
				.orderBy(desc(threads.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			const blockedUserIds = viewerUserId ? await getPlatformBlockedUserIds(this.db, viewerUserId) : null;
			const filteredData = blockedUserIds
				? retrieveData.filter(row => !blockedUserIds.has(row.thread.userId))
				: retrieveData;

			if (!this.isModeratorRole(viewerRole)) {
				const threadIds = filteredData.map((row) => row.thread.id);
				if (threadIds.length > 0) {
					const modeRows = await this.db
						.select({ threadId: threadCategoryModes.threadId })
						.from(threadCategoryModes)
						.where(and(eq(threadCategoryModes.mode, "PSEUDONYMOUS_CHIKA"), inArray(threadCategoryModes.threadId, threadIds)));
					const pseudoThreadIds = new Set(modeRows.map((row) => row.threadId));

					if (pseudoThreadIds.size > 0) {
						const pseudoRows = await this.db
							.select({
								threadId: chikaPseudonyms.threadId,
								userId: chikaPseudonyms.userId,
								displayHandle: chikaPseudonyms.displayHandle
							})
							.from(chikaPseudonyms)
							.where(inArray(chikaPseudonyms.threadId, Array.from(pseudoThreadIds)));

						const pseudoMap = new Map<string, string>();
						for (const row of pseudoRows) {
							pseudoMap.set(`${row.threadId}:${row.userId}`, row.displayHandle);
						}

						for (const row of filteredData) {
							if (!pseudoThreadIds.has(row.thread.id) || !row.user) continue;
							row.thread.userId = 0;
							row.user = {
								id: 0,
								username:
									pseudoMap.get(`${row.thread.id}:${row.thread.userId}`) ??
									this.buildPseudonymHandle(row.thread.userId, row.thread.id),
								email: null,
								alias: null
							};
						}
					}
				}
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Threads retrieved successfully",
				filteredData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}


	// Comments methods
	async createComment(data: ThreadCommentInput) {
		try {
			const isChikaDisabled = await isUserFeatureRestricted(this.db, data.userId, "CHIKA_POSTING_DISABLED");
			if (isChikaDisabled) {
				return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Chika posting is disabled for this account");
			}

			const isLockedOrRemoved = await isThreadLockedOrRemoved(this.db, data.threadId);
			if (isLockedOrRemoved) {
				return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Thread is locked or removed");
			}

			const activeThread = await this.db
				.select({ id: threads.id })
				.from(threads)
				.where(and(eq(threads.id, data.threadId), isNull(threads.deletedAt)))
				.limit(1);
			if (!activeThread[0]) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			const todayStart = new Date();
			todayStart.setUTCHours(0, 0, 0, 0);

				const mode = await this.getThreadMode(data.threadId);
				if (mode === "PSEUDONYMOUS_CHIKA") {
				const ageHours = await this.getAccountAgeHours(data.userId);
				if (ageHours < ABUSE_LIMITS.minimumAccountAgeHoursForPseudonymousChika) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_403_FORBIDDEN,
						`Posting in pseudonymous mode requires account age >= ${ABUSE_LIMITS.minimumAccountAgeHoursForPseudonymousChika} hours`
					);
				}

				const pseudoRepliesRows = await this.db
					.select({ total: count(comments.id) })
					.from(comments)
					.innerJoin(threadCategoryModes, eq(threadCategoryModes.threadId, comments.threadId))
					.where(
						and(
							eq(comments.userId, data.userId),
							eq(threadCategoryModes.mode, "PSEUDONYMOUS_CHIKA"),
							gte(comments.createdAt, todayStart)
						)
					);
				if ((pseudoRepliesRows[0]?.total ?? 0) >= ABUSE_LIMITS.pseudonymousPostsPerDay) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_429_TOO_MANY_REQUESTS,
						`Daily pseudonymous reply limit reached (${ABUSE_LIMITS.pseudonymousPostsPerDay})`
					);
				}

				const existingPseudo = await this.db
					.select({ id: chikaPseudonyms.id })
					.from(chikaPseudonyms)
					.where(and(eq(chikaPseudonyms.threadId, data.threadId), eq(chikaPseudonyms.userId, data.userId)))
					.limit(1);

				if (!existingPseudo[0]) {
					await this.db.insert(chikaPseudonyms).values({
						threadId: data.threadId,
						userId: data.userId,
						displayHandle: this.buildPseudonymHandle(data.userId, data.threadId)
					});
				}
			} else {
				const dailyRepliesRows = await this.db
					.select({ total: count(comments.id) })
					.from(comments)
					.where(and(eq(comments.userId, data.userId), gte(comments.createdAt, todayStart)));
				if ((dailyRepliesRows[0]?.total ?? 0) >= ABUSE_LIMITS.postsPerDay) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_429_TOO_MANY_REQUESTS,
						`Daily post limit reached (${ABUSE_LIMITS.postsPerDay})`
					);
				}
			}

			const createdData = await this.db.insert(comments).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid comment data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Comment created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async setThreadMode(
		threadId: number,
		mode: "NORMAL" | "PSEUDONYMOUS_CHIKA",
		actorUserId: number,
		actorRole: string
	) {
		try {
			const threadRows = await this.db
				.select({ id: threads.id, userId: threads.userId, createdAt: threads.createdAt })
				.from(threads)
				.where(eq(threads.id, threadId))
				.limit(1);

			const targetThread = threadRows[0];
			if (!targetThread) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			const isModerator = this.isModeratorRole(actorRole);
			if (!isModerator && targetThread.userId !== actorUserId) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_403_FORBIDDEN,
					"Only thread owner or moderator can change thread mode"
				);
			}

			if (mode === "PSEUDONYMOUS_CHIKA") {
				const ageHours = await this.getAccountAgeHours(targetThread.userId);
				if (ageHours < ABUSE_LIMITS.minimumAccountAgeHoursForPseudonymousChika) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_403_FORBIDDEN,
						`Pseudonymous mode requires account age >= ${ABUSE_LIMITS.minimumAccountAgeHoursForPseudonymousChika} hours`
					);
				}

				const todayStart = new Date();
				todayStart.setUTCHours(0, 0, 0, 0);
				const pseudoThreadRows = await this.db
					.select({ total: count(threadCategoryModes.id) })
					.from(threadCategoryModes)
					.innerJoin(threads, eq(threadCategoryModes.threadId, threads.id))
					.where(
						and(
							eq(threadCategoryModes.mode, "PSEUDONYMOUS_CHIKA"),
							eq(threads.userId, targetThread.userId),
							gte(threads.createdAt, todayStart)
						)
					);
				if ((pseudoThreadRows[0]?.total ?? 0) >= ABUSE_LIMITS.pseudonymousThreadsPerDay) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_429_TOO_MANY_REQUESTS,
						`Daily pseudonymous thread limit reached (${ABUSE_LIMITS.pseudonymousThreadsPerDay})`
					);
				}
			}

			const existing = await this.db
				.select({ id: threadCategoryModes.id })
				.from(threadCategoryModes)
				.where(eq(threadCategoryModes.threadId, threadId))
				.limit(1);

			if (existing[0]) {
				const updated = await this.db
					.update(threadCategoryModes)
					.set({ mode })
					.where(eq(threadCategoryModes.threadId, threadId))
					.returning();

				return ServiceResponse.createResponse(status.HTTP_200_OK, "Thread mode updated", updated[0]);
			}

			const created = await this.db.insert(threadCategoryModes).values({ threadId, mode }).returning();
			return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Thread mode created", created[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getOrCreatePseudonym(threadId: number, userId: number) {
		try {
			const existing = await this.db
				.select()
				.from(chikaPseudonyms)
				.where(and(eq(chikaPseudonyms.threadId, threadId), eq(chikaPseudonyms.userId, userId)))
				.limit(1);

			if (existing[0]) {
				return ServiceResponse.createResponse(status.HTTP_200_OK, "Pseudonym retrieved", existing[0]);
			}

			const created = await this.db
				.insert(chikaPseudonyms)
				.values({
					threadId,
					userId,
					displayHandle: this.buildPseudonymHandle(userId, threadId)
				})
				.returning();

			return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Pseudonym created", created[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getComments(
		threadId: number,
		query: PaginationQuerySchemaType,
		viewerUserId: number | null = null,
		viewerRole: string | null = null
	) {
		try {
			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(comments)
				.where(and(eq(comments.threadId, threadId), isNull(comments.deletedAt)));
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const retrieveData = await this.db
				.select({
					comment: comments,
					user: {
						id: users.id,
						username: users.username,
						alias: users.alias,
					},
				})
				.from(comments)
				.leftJoin(users, eq(comments.userId, users.id))
				.where(and(eq(comments.threadId, threadId), isNull(comments.deletedAt)))
				.orderBy(desc(comments.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			const blockedUserIds = viewerUserId ? await getPlatformBlockedUserIds(this.db, viewerUserId) : null;
			const filteredData = blockedUserIds
				? retrieveData.filter(row => !blockedUserIds.has(row.comment.userId))
				: retrieveData;

			if (!this.isModeratorRole(viewerRole)) {
				const mode = await this.getThreadMode(threadId);
				if (mode === "PSEUDONYMOUS_CHIKA") {
					const userIds = Array.from(new Set(filteredData.map((row) => row.comment.userId)));
					if (userIds.length > 0) {
						const pseudoRows = await this.db
							.select({
								userId: chikaPseudonyms.userId,
								displayHandle: chikaPseudonyms.displayHandle
							})
							.from(chikaPseudonyms)
							.where(and(eq(chikaPseudonyms.threadId, threadId), inArray(chikaPseudonyms.userId, userIds)));

						const pseudoMap = new Map<number, string>();
						for (const row of pseudoRows) {
							pseudoMap.set(row.userId, row.displayHandle);
						}

						for (const row of filteredData) {
							if (!row.user) continue;
							row.comment.userId = 0;
							row.user = {
								id: 0,
								username: pseudoMap.get(row.comment.userId) ?? this.buildPseudonymHandle(row.comment.userId, threadId),
								alias: null
							};
						}
					}
				}
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Comments retrieved successfully",
				filteredData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Reactions methods
	async addReaction(threadId: number, data: ReactionInput) {
		try {
			const existingReaction = await this.db
				.select()
				.from(reactions)
				.where(and(eq(reactions.threadId, threadId), eq(reactions.userId, data.userId)))
				.limit(1);

			if (existingReaction.length > 0) {
				const updatedData = await this.db
					.update(reactions)
					.set({ type: data.type })
					.where(and(eq(reactions.threadId, threadId), eq(reactions.userId, data.userId)))
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Reaction updated successfully",
					updatedData[0]
				);
			}

			try {
				const createdData = await this.db
					.insert(reactions)
					.values({ ...data, threadId })
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_201_CREATED,
					"Reaction added successfully",
					createdData[0]
				);
			} catch (insertError) {
				const isUniqueConstraintError =
					typeof insertError === "object" &&
					insertError !== null &&
					"code" in insertError &&
					(insertError as { code?: string }).code === "23505";

				if (!isUniqueConstraintError) {
					throw insertError;
				}

				const updatedData = await this.db
					.update(reactions)
					.set({ type: data.type })
					.where(and(eq(reactions.threadId, threadId), eq(reactions.userId, data.userId)))
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Reaction updated successfully",
					updatedData[0]
				);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeReaction(threadId: number, userId: number) {
		try {
			const deletedData = await this.db
				.delete(reactions)
				.where(and(eq(reactions.threadId, threadId), eq(reactions.userId, userId)))
				.returning();

			if (!deletedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Reaction not found",
					null
				);
			}

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Reaction removed successfully",
				deletedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async delete(id: number, actorUserId: number, actorRole: string) {
		try {
			const existingRows = await this.db
				.select({ userId: threads.userId })
				.from(threads)
				.where(and(eq(threads.id, id), isNull(threads.deletedAt)))
				.limit(1);

			const existing = existingRows[0];
			if (!existing) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			if (!this.isModeratorRole(actorRole) && existing.userId !== actorUserId) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_403_FORBIDDEN,
					"Only thread owner or moderator can delete this thread"
				);
			}

			const deletedData = await this.db
				.update(threads)
				.set({
					title: "[deleted thread]",
					content: "[deleted thread]",
					deletedAt: new Date()
				})
				.where(and(eq(threads.id, id), isNull(threads.deletedAt)))
				.returning();

				if (!deletedData.length) {
					return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
				}

				await this.db.insert(auditLogs).values({
					actorUserId: actorUserId,
					action: "THREAD_DELETED",
					targetType: "THREAD",
					targetId: String(id),
					metadata: {
						isModeratorAction: this.isModeratorRole(actorRole)
					}
				});

				return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Thread deleted successfully",
				deletedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
