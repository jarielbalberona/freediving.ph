import { Request, Response } from "express";

import UserServicesService from "@/app/userServices/userServices.service";
import { UserServicesServerSchema, UserServicesUpdateSchema, ServiceBookingSchema, ServiceReviewSchema } from "@/app/userServices/userServices.validators";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class UserServicesController extends ApiController {
	protected userServicesService: UserServicesService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.userServicesService = new UserServicesService();
	}

	async createService() {
		try {
			const body = this.request.body;
			const check = UserServicesServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.userServicesService.create(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getServiceById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.userServicesService.retrieve(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllServices() {
		try {
			const response = await this.userServicesService.retrieveAll();
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getUserServices() {
		try {
			const userId = Number(this.request.params.userId);
			const response = await this.userServicesService.getUserServices(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateService() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = UserServicesUpdateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.userServicesService.update(id, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async createBooking() {
		try {
			const body = this.request.body;
			const check = ServiceBookingSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.userServicesService.createBooking(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getServiceBookings() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.userServicesService.getServiceBookings(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getUserBookings() {
		try {
			const userId = Number(this.request.params.userId);
			const response = await this.userServicesService.getUserBookings(userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async createReview() {
		try {
			const body = this.request.body;
			const check = ServiceReviewSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.userServicesService.createReview(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getServiceReviews() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.userServicesService.getServiceReviews(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateBookingStatus() {
		try {
			const id = Number(this.request.params.id);
			const { status: newStatus } = this.request.body;
			const response = await this.userServicesService.updateBookingStatus(id, newStatus);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
