import { InferSelectModel, and, desc, eq, count, sql } from "drizzle-orm";

import { GroupsServerSchemaType, GroupsUpdateSchemaType, GroupMemberSchemaType, GroupPostSchemaType } from "./groups.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { groups, groupMembers, groupPosts, groupPostComments, groupPostLikes } from "@/models/drizzle/groups.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type GroupsSchemaType = InferSelectModel<typeof groups>;

export default class GroupsService extends DrizzleService {
	async create(data: GroupsServerSchemaType) {
		try {
			const insertData = {
				...data,
				lat: data.lat?.toString(),
				lng: data.lng?.toString(),
			};
			const createdData = await this.db.insert(groups).values(insertData).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid group data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Group created successfully",
				createdData[0]
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async retrieve(id: number): Promise<ServiceApiResponse<GroupsSchemaType>> {
		try {
			const retrieveData = await this.db.query.groups.findFirst({
				where: eq(groups.id, id),
				with: {
					creator: {
						columns: {
							id: true,
							username: true,
							email: true,
							alias: true,
						},
					},
					members: {
						with: {
							user: {
								columns: {
									id: true,
									username: true,
									alias: true,
								},
							},
						},
					},
				},
			});

			if (!retrieveData) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Group not found"
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Group retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: GroupsUpdateSchemaType) {
		try {
			const updateData = {
				...data,
				lat: data.lat?.toString(),
        lng: data.lng?.toString(),
			};
			const updatedData = await this.db.update(groups).set(updateData).where(eq(groups.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid group id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Group updated successfully",
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
					group: groups,
					creator: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias,
					},
					memberCount: count(groupMembers.id),
				})
				.from(groups)
				.leftJoin(users, eq(groups.createdBy, users.id))
				.leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
				.groupBy(groups.id, users.id)
				.orderBy(desc(groups.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Groups retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Group Members methods
	async addMember(data: GroupMemberSchemaType) {
		try {
			// Check if user is already a member
			const existingMember = await this.db
				.select()
				.from(groupMembers)
				.where(and(eq(groupMembers.groupId, data.groupId), eq(groupMembers.userId, data.userId)))
				.limit(1);

			if (existingMember.length > 0) {
				return ServiceResponse.createResponse(
					status.HTTP_409_CONFLICT,
					"User is already a member of this group",
					existingMember[0]
				);
			}

			const createdData = await this.db.insert(groupMembers).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid member data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Member added successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeMember(groupId: number, userId: number) {
		try {
			const deletedData = await this.db
				.delete(groupMembers)
				.where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
				.returning();

			if (!deletedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Member not found",
					null
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Member removed successfully",
				deletedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getMembers(groupId: number) {
		try {
			const retrieveData = await this.db
				.select({
					member: groupMembers,
					user: {
						id: users.id,
						username: users.username,
						alias: users.alias,
						email: users.email,
					},
				})
				.from(groupMembers)
				.leftJoin(users, eq(groupMembers.userId, users.id))
				.where(eq(groupMembers.groupId, groupId))
				.orderBy(desc(groupMembers.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Group members retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Group Posts methods
	async createPost(data: GroupPostSchemaType) {
		try {
			const createdData = await this.db.insert(groupPosts).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid post data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Post created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getPosts(groupId: number) {
		try {
			const retrieveData = await this.db
				.select({
					post: groupPosts,
					author: {
						id: users.id,
						username: users.username,
						alias: users.alias,
					},
					commentCount: count(groupPostComments.id),
					likeCount: count(groupPostLikes.id),
				})
				.from(groupPosts)
				.leftJoin(users, eq(groupPosts.authorId, users.id))
				.leftJoin(groupPostComments, eq(groupPosts.id, groupPostComments.postId))
				.leftJoin(groupPostLikes, eq(groupPosts.id, groupPostLikes.postId))
				.where(eq(groupPosts.groupId, groupId))
				.groupBy(groupPosts.id, users.id)
				.orderBy(desc(groupPosts.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Group posts retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
