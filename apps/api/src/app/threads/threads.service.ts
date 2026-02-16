import { InferSelectModel, and, desc, eq, count, sql } from "drizzle-orm";

import { ThreadsServerSchemaType, ThreadsUpdateSchemaType, CommentCreateSchemaType, ReactionSchemaType } from "@/app/threads/threads.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { threads, comments, reactions } from "@/models/drizzle/threads.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type ThreadsSchemaType = InferSelectModel<typeof threads>;
type ThreadCreateInput = ThreadsServerSchemaType & { userId: number };
type ThreadCommentInput = CommentCreateSchemaType & { userId: number };
type ReactionInput = ReactionSchemaType & { userId: number };

export default class ThreadsService extends DrizzleService {
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
			return Promise.reject(error);
		}
	}

async retrieve(id: number): Promise<ServiceApiResponse<ThreadsSchemaType>> {
  try {
    const retrieveData = await this.db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true, // Include only necessary fields
          },
        },
      },
    });

    if (!retrieveData) {
      return ServiceResponse.createRejectResponse(
        status.HTTP_404_NOT_FOUND,
        "Thread not found"
      );
    }

    return ServiceResponse.createResponse(
      status.HTTP_200_OK,
      "Thread retrieved successfully",
      retrieveData
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


async retrieveAll() {
  try {
    const retrieveData = await this.db
      .select({
        thread: threads,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          alias: users.alias,
        },
        commentCount: count(comments.id),
        upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${reactions.type} = '1' THEN 1 ELSE 0 END), 0)`,
        downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${reactions.type} = '0' THEN 1 ELSE 0 END), 0)`,
      })
      .from(threads)
      .leftJoin(users, eq(threads.userId, users.id))
      .leftJoin(comments, eq(threads.id, comments.threadId))
      .leftJoin(reactions, eq(threads.id, reactions.threadId))
      .groupBy(threads.id, users.id)
      .orderBy(desc(threads.createdAt));

    return ServiceResponse.createResponse(
      status.HTTP_200_OK,
      "Threads retrieved successfully",
      retrieveData
    );
  } catch (error) {
    return ServiceResponse.createErrorResponse(error);
  }
}


	// Comments methods
	async createComment(data: ThreadCommentInput) {
		try {
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

	async getComments(threadId: number) {
		try {
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
				.orderBy(desc(comments.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Comments retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Reactions methods
	async addReaction(threadId: number, data: ReactionInput) {
		try {
			// Check if user already reacted to this thread
				const existingReaction = await this.db
					.select()
					.from(reactions)
					.where(and(eq(reactions.threadId, threadId), eq(reactions.userId, data.userId)))
					.limit(1);

			if (existingReaction.length > 0) {
				// Update existing reaction
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
			} else {
				// Create new reaction
				const createdData = await this.db
					.insert(reactions)
					.values({ ...data, threadId })
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_201_CREATED,
					"Reaction added successfully",
					createdData[0]
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
}
