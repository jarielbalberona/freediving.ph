import { Request, Response } from "express";

import DiveSpotService from "@/app/diveSpot/diveSpot.service";
import { DiveSpotServerSchema } from "@/app/diveSpot/diveSpot.validators";

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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.diveSpotService.updateDiveSpot(id, check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllDiveSpot() {
		try {
			const response = await this.diveSpotService.retrieveAllDiveSpot();
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
