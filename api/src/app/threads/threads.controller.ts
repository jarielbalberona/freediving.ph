import { Request, Response } from "express";

import ThreadsService from "@/app/threads/threads.service";
import { ThreadsServerSchema } from "@/app/threads/threads.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class ThreadsController extends ApiController {
	protected threadsService: ThreadsService;
	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.threadsService = new ThreadsService();
	}

	async createThreads() {
		try {
			const body = this.request.body;
			const check = ThreadsServerSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.threadsService.create(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveThreads() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.threadsService.retrieve(id);

			// await this.threadsService.testThreads(response.data.id);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateThreads() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = ThreadsServerSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.threadsService.update(id, check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllThreads() {
		try {
			const response = await this.threadsService.retrieveAll();
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
