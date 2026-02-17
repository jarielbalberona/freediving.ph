import { Request, Response } from "express";

import UserService from "@/app/user/user.service";
import { UserCreateSchema, UserDeleteSchema, UserQuerySchema } from "@/app/user/user.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { UserSchemaType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";
import { ServiceApiResponse } from "@/utils/serviceApi";
import { SortingHelper } from "@/utils/sortingHelper";

export default class UserController extends ApiController {
	protected userService: UserService;
	private sortingHelper: SortingHelper<typeof users>;

	/**
	 * Constructor
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.userService = new UserService();
		this.sortingHelper = new SortingHelper(users);
	}

	async index() {
		try {
			const { query } = this.request;

			const check = UserQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				return this.validationError(check.error);
			}

			const data = await this.userService.retrieveUsers({
				page: check.data.page,
				limit: check.data.limit,
				sortingMethod: check.data.sortingMethod,
				sortBy: check.data.sortBy,
				search: check.data.search,
				roleQuery: check.data.roleQuery
			});

			return this.apiResponse.sendResponse(data);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async create() {
		try {
			const { body } = this.request;

			const check = UserCreateSchema.safeParse(body);
			if (!check.success) {
				return this.validationError(check.error);
			}
			const mergedData: Omit<UserSchemaType, "id" | "createdAt" | "updatedAt"> = {
				...check.data,
				clerkId: "temp-clerk-id", // This should be provided by Clerk webhook
				image: null,
				emailVerified: check.data.emailVerified ? new Date() : null,
				bio: null,
				location: null,
				phone: null,
				website: null,
				homeDiveArea: null,
				experienceLevel: null,
				visibility: "PUBLIC",
				buddyFinderVisibility: "VISIBLE",
				isServiceProvider: false,
				accountStatus: "ACTIVE"
			};

			const data = await this.userService.createUser(mergedData);

			return this.apiResponse.sendResponse(data);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async delete() {
		try {
			const { body } = this.request;

			const check = UserDeleteSchema.safeParse(body);
			if (!check.success) {
				return this.validationError(check.error);
			}

			if (check.data.ids.length > 0) {
				const isAdmin = ["ADMINISTRATOR", "SUPER_ADMIN"].includes(this.request.user.role);
				if (!isAdmin) {
					return this.apiResponse.forbiddenResponse("Only admins can anonymize other users");
				}

				const data = await this.userService.deleteUserByIds(body.ids);

				return this.apiResponse.sendResponse(data);
			} else {
				const data = await this.userService.anonymizeUserAccount(this.request.user.id);

				return this.apiResponse.sendResponse(data);
			}
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async export() {
		try {
			const data = await this.userService.exportUsersToCSV();

			return this.apiResponse.sendResponse(data);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
