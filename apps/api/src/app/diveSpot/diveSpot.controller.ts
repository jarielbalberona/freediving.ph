import { Request, Response } from "express";

import DiveSpotService from "@/app/diveSpot/diveSpot.service";
import {
	DiveSpotListQuerySchema,
	DiveSpotReviewSchema,
	DiveSpotServerSchema
} from "@/app/diveSpot/diveSpot.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class DiveSpotController extends ApiController {
	protected diveSpotService: DiveSpotService;
	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.diveSpotService = new DiveSpotService();
	}

	async createDiveSpot() {
		try {
			const body = this.request.body;
			const check = DiveSpotServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.diveSpotService.createDiveSpot(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveDiveSpot() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.diveSpotService.retrieveDiveSpot(id);

			// await this.diveSpotService.testDiveSpot(response.data.id);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateDiveSpot() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = DiveSpotServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.diveSpotService.updateDiveSpot(id, check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllDiveSpot() {
		try {
			const queryCheck = DiveSpotListQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.diveSpotService.retrieveAllDiveSpot(queryCheck.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async reviewDiveSpot() {
		try {
			const id = Number(this.request.params.id);
			const check = DiveSpotReviewSchema.safeParse(this.request.body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.diveSpotService.reviewDiveSpot(
				id,
				check.data.state,
				this.request.context?.appUserId ?? undefined
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
