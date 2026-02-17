import { Request, Response } from "express";

import EventsService from "@/app/events/events.service";
import { EventsServerSchema, EventsUpdateSchema, EventAttendeeSchema } from "@/app/events/events.validators";
import { PaginationQuerySchema } from "@/validators/pagination.schema";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class EventsController extends ApiController {
	protected eventsService: EventsService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.eventsService = new EventsService();
	}

	async createEvent() {
		try {
			const body = this.request.body;
			const check = EventsServerSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.eventsService.create(check.data, this.request.context!.appUserId!, this.request.context!.globalRole);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getEventById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.eventsService.retrieve(id, this.request.context?.appUserId ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllEvents() {
		try {
			const queryCheck = PaginationQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.eventsService.retrieveAll(queryCheck.data, this.request.context?.appUserId ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateEvent() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = EventsUpdateSchema.safeParse(body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.eventsService.update(id, check.data, this.request.context!.appUserId!, this.request.context!.globalRole);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async moderateRemoveEvent() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.eventsService.moderateRemove(id, this.request.context!.appUserId!);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async addAttendee() {
		try {
			const id = Number(this.request.params.id);
			const check = EventAttendeeSchema.safeParse(this.request.body);
			if (!check.success)
				return this.validationError(check.error);

			const response = await this.eventsService.addAttendee(id, this.request.context!.appUserId!, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeAttendee() {
		try {
			const eventId = Number(this.request.params.id);
			const userId = Number(this.request.params.userId);
			const response = await this.eventsService.removeAttendee(
				eventId,
				userId,
				this.request.context!.appUserId!,
				this.request.context!.globalRole
			);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getEventAttendees() {
		try {
			const id = Number(this.request.params.id);
			const queryCheck = PaginationQuerySchema.safeParse(this.request.query);
			if (!queryCheck.success) return this.validationError(queryCheck.error);

			const response = await this.eventsService.getAttendees(id, queryCheck.data, this.request.context?.appUserId ?? null);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
