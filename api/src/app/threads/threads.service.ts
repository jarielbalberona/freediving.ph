import { InferSelectModel, desc, eq } from "drizzle-orm";

import { ThreadsServerSchemaType } from "@/app/threads/threads.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { threads } from "@/models/drizzle/threads.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type ThreadsSchemaType = InferSelectModel<typeof threads>;

export default class ThreadsService extends DrizzleService {
	async create(data: ThreadsServerSchemaType) {
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
			const retrieveData = await this.db.query.threads.findFirst({ where: eq(threads.id, id) });

			if (!retrieveData) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: ThreadsServerSchemaType) {
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
				"Dive spot updated successfully",
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
        thread: threads, // Select all thread fields
        user: {
          id: users.id,
          username: users.username, // Include necessary user details
          email: users.email,
          alias: users.alias,
        },
      })
      .from(threads)
      .leftJoin(users, eq(threads.userId, users.id)) // Join with users table
      .orderBy(desc(threads.createdAt));

    return ServiceResponse.createResponse(
      status.HTTP_200_OK,
      "Dive spots retrieved successfully",
      retrieveData
    );
  } catch (error) {
    return ServiceResponse.createErrorResponse(error);
  }
}


	async testThreads(id: number) {
		try {
			return ServiceResponse.createRejectResponse(
				status.HTTP_406_NOT_ACCEPTABLE,
				"Dive spot not accept"
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
