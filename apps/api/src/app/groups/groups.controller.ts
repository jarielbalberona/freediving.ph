import { Request, Response } from "express";

import GroupsService from "@/app/groups/groups.service";
import { GroupsServerSchema, GroupsUpdateSchema, GroupMemberSchema, GroupPostSchema } from "@/app/groups/groups.validators";
import { PaginationQuerySchema } from "@/validators/pagination.schema";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class GroupsController extends ApiController {
	protected groupsService: GroupsService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.groupsService = new GroupsService();
	}

	async createGroup() {
		try {
			const body = {
				...this.request.body,
				createdBy: this.request.user.id
			};
			const check = GroupsServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.groupsService.create(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.groupsService.retrieve(id, this.request.user?.id ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllGroups() {
		try {
			const queryCheck = PaginationQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.groupsService.retrieveAll(queryCheck.data, this.request.user?.id ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateGroup() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = GroupsUpdateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.groupsService.update(id, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async addMember() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = GroupMemberSchema.safeParse({ ...body, groupId: id });
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.groupsService.addMember(check.data, this.request.user.id, this.request.user.role);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeMember() {
		try {
			const groupId = Number(this.request.params.id);
			const userId = Number(this.request.params.userId);
			const response = await this.groupsService.removeMember(
				groupId,
				userId,
				this.request.user.id,
				this.request.user.role
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupMembers() {
		try {
			const id = Number(this.request.params.id);
			const queryCheck = PaginationQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.groupsService.getMembers(id, queryCheck.data, this.request.user?.id ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async joinGroup() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.groupsService.joinGroup(id, this.request.user.id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async reviewJoinRequest() {
		try {
			const groupId = Number(this.request.params.id);
			const userId = Number(this.request.params.userId);
			const actionParam = String(this.request.params.action || "").toLowerCase();
			if (actionParam !== "approve" && actionParam !== "reject") {
				return this.apiResponse.badResponse("Action must be either approve or reject");
			}
			const action = actionParam as "approve" | "reject";
			const response = await this.groupsService.reviewJoinRequest(groupId, userId, this.request.user.id, action);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async createPost() {
		try {
			const id = Number(this.request.params.id);
			const check = GroupPostSchema.safeParse({ ...this.request.body, groupId: id });
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.groupsService.createPost(check.data, this.request.user.id, this.request.user.role);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupPosts() {
		try {
			const id = Number(this.request.params.id);
			const queryCheck = PaginationQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.groupsService.getPosts(id, queryCheck.data, this.request.user?.id ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
