import { and, count, eq, getTableColumns, ilike, inArray } from "drizzle-orm";
import { Json2CsvOptions, json2csv } from "json-2-csv";

// Authentication service removed - using Clerk now

import PaginationManager from "@/core/pagination";
import { LEGACY_ROLE_TO_GLOBAL_ROLES } from "@/core/legacyRoleMapping";
import DrizzleService from "@/databases/drizzle/service";
import { UserSchemaType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";
import { messages } from "@/models/drizzle/messages.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { profileActivityItems, personalBests } from "@/models/drizzle/profiles.model";
import { comments, threads } from "@/models/drizzle/threads.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { SortingHelper } from "@/utils/sortingHelper";
import { status } from "@/utils/statusCodes";

export default class UserService extends DrizzleService {
	private sortingHelper: SortingHelper<typeof users>;
	constructor() {
		super();
		this.sortingHelper = new SortingHelper(users);
	}

	async createUser(
		data: Omit<UserSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<Omit<UserSchemaType, "clerkId">>> {
		try {
			const user = await this.db.insert(users).values(data).returning();

			const { clerkId, ...userData } = user[0];

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"User created successfully",
				userData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveUsers(
		filter: UserFilter
	): Promise<ServiceApiResponse<Omit<UserSchemaType, "clerkId">[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllUsers(filter.sortingMethod, filter.sortBy);
			}

			const mappedGlobalRoles = Array.from(
				new Set(
					(filter.roleQuery ?? [])
						.flatMap((role) => LEGACY_ROLE_TO_GLOBAL_ROLES[String(role).toUpperCase()] ?? [])
				)
			);

			const conditions = [
				filter.search ? ilike(users.name, `%${filter.search}%`) : undefined,
				mappedGlobalRoles.length ? inArray(users.globalRole, mappedGlobalRoles) : undefined
			].filter(Boolean);
			const whereClause = conditions.length > 0 ? and(...conditions as any[]) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(users)
				.where(whereClause)
				.then(result => Number(result[0]?.count ?? 0));

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const { clerkId: _clerkId, ...userColumns } = getTableColumns(users);
			const dataQuery = this.db
				.select(userColumns)
				.from(users)
				.where(whereClause);

			const data = await (orderBy ? dataQuery.orderBy(orderBy) : dataQuery)
				.limit(filter.limit)
				.offset(offset);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Users retrieved successfully",
				data,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteUserByIds(ids: number[]): Promise<ServiceApiResponse<boolean>> {
		try {
			for (const userId of ids) {
				await this.anonymizeUserAccount(userId);
			}

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Users anonymized successfully", true);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async anonymizeUserAccount(userId: number): Promise<ServiceApiResponse<boolean>> {
		try {
			const anonymizedUsername = `deleted-user-${userId}`;
			const anonymizedAlias = `deleted_${userId}`;

			const updatedUsers = await this.db
				.update(users)
				.set({
					accountStatus: "DELETED",
					name: null,
					username: anonymizedUsername,
					alias: anonymizedAlias,
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
				.where(eq(users.id, userId))
				.returning({ id: users.id });

			if (!updatedUsers[0]) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "User not found");
			}

			await this.db
				.update(threads)
				.set({
					title: "[deleted user thread]",
					content: "[deleted user content]",
					deletedAt: new Date()
				})
				.where(eq(threads.userId, userId));

			await this.db
				.update(comments)
				.set({
					content: "[deleted user content]",
					deletedAt: new Date()
				})
				.where(eq(comments.userId, userId));

			await this.db
				.update(messages)
				.set({
					content: "[deleted user content]",
					type: "SYSTEM",
					deletedAt: new Date()
				})
				.where(eq(messages.senderId, userId));

			await this.db.update(personalBests).set({ deletedAt: new Date() }).where(eq(personalBests.userId, userId));
			await this.db
				.update(profileActivityItems)
				.set({ deletedAt: new Date(), text: "[removed]" })
				.where(eq(profileActivityItems.userId, userId));

			await this.db.insert(auditLogs).values({
				actorUserId: userId,
				action: "USER_ACCOUNT_ANONYMIZED",
				targetType: "USER",
				targetId: String(userId)
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "User account anonymized successfully", true);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async exportUsersToCSV(): Promise<ServiceApiResponse<string>> {
		try {
			const usersResponse = await this.retrieveAllUsers("id", "asc");

			const options: Json2CsvOptions = {
				delimiter: {
					field: ",",
					wrap: '"'
				},
				prependHeader: true
			};

			const csvContent = json2csv(usersResponse.data, options);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"CSV file generated successfully",
				csvContent
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAllUsers(
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<Omit<UserSchemaType, "clerkId">[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const data = await this.db.query.users.findMany({
				columns: { clerkId: false },
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Users retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
