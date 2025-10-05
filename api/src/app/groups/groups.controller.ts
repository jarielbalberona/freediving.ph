import { Request, Response } from "express";

import GroupsService from "@/app/groups/groups.service";
import { GroupsServerSchema, GroupsUpdateSchema, GroupMemberSchema, GroupPostSchema } from "@/app/groups/groups.validators";

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
			const body = this.request.body;
			const check = GroupsServerSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.groupsService.create(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.groupsService.retrieve(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllGroups() {
		try {
			const response = await this.groupsService.retrieveAll();
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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.groupsService.addMember(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeMember() {
		try {
			const groupId = Number(this.request.params.id);
			const userId = Number(this.request.params.userId);
			const response = await this.groupsService.removeMember(groupId, userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupMembers() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.groupsService.getMembers(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async createPost() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = GroupPostSchema.safeParse({ ...body, groupId: id });
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.groupsService.createPost(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getGroupPosts() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.groupsService.getPosts(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
