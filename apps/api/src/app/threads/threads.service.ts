import { InferSelectModel, and, desc, eq, sql } from "drizzle-orm";

import { ThreadsServerSchemaType, ThreadsUpdateSchemaType, CommentCreateSchemaType, ReactionSchemaType } from "@/app/threads/threads.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
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
		id: number;
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
	private buildPseudonymHandle(userId: number, threadId: number) {
		const seed = Math.abs((userId * 97 + threadId * 131) % 10000)
			.toString()
			.padStart(4, "0");
		return `Diver-${seed}`;
	}

	async create(data: ThreadCreateInput) {
		try {
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

	async retrieve(id: number): Promise<ServiceApiResponse<ThreadWithUserRow>> {
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
				.where(eq(threads.id, id))
				.groupBy(threads.id, users.id)
				.limit(1);

			if (!retrieveData.length) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Thread retrieved successfully",
				retrieveData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}


	async update(id: number, data: ThreadsUpdateSchemaType) {
		try {
			const updatedData = await this.db.update(threads).set(data).where(eq(threads.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid thread id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Thread updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAll(query: PaginationQuerySchemaType) {
		try {
			const totalRows = await this.db.select({ count: sql<number>`count(*)` }).from(threads);
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
				.groupBy(threads.id, users.id)
				.orderBy(desc(threads.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Threads retrieved successfully",
				retrieveData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}


	// Comments methods
	async createComment(data: ThreadCommentInput) {
		try {
			const modeRows = await this.db
				.select({ mode: threadCategoryModes.mode })
				.from(threadCategoryModes)
				.where(eq(threadCategoryModes.threadId, data.threadId))
				.limit(1);

			if (modeRows[0]?.mode === "PSEUDONYMOUS_CHIKA") {
				const userRows = await this.db
					.select({ createdAt: users.createdAt })
					.from(users)
					.where(eq(users.id, data.userId))
					.limit(1);

				const createdAt = userRows[0]?.createdAt;
				if (createdAt) {
					const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
					if (ageHours < 24) {
						return ServiceResponse.createRejectResponse(
							status.HTTP_403_FORBIDDEN,
							"Posting in pseudonymous mode requires account age >= 24 hours"
						);
					}
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

	async setThreadMode(threadId: number, mode: "NORMAL" | "PSEUDONYMOUS_CHIKA") {
		try {
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

	async getComments(threadId: number, query: PaginationQuerySchemaType) {
		try {
			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(comments)
				.where(eq(comments.threadId, threadId));
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
				.where(eq(comments.threadId, threadId))
				.orderBy(desc(comments.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Comments retrieved successfully",
				retrieveData,
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

	async delete(id: number) {
		try {
			const deletedData = await this.db.delete(threads).where(eq(threads.id, id)).returning();

			if (!deletedData.length) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Thread not found");
			}

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
