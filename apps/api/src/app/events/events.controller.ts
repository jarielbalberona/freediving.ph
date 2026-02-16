import { Request, Response } from "express";

import EventsService from "@/app/events/events.service";
import { EventsServerSchema, EventsUpdateSchema, EventAttendeeSchema } from "@/app/events/events.validators";

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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.eventsService.create(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getEventById() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.eventsService.retrieve(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getAllEvents() {
		try {
			const response = await this.eventsService.retrieveAll();
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
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.eventsService.update(id, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async addAttendee() {
		try {
			const id = Number(this.request.params.id);
			const body = this.request.body;
			const check = EventAttendeeSchema.safeParse({ ...body, eventId: id });
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join("\n"));

			const response = await this.eventsService.addAttendee(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeAttendee() {
		try {
			const eventId = Number(this.request.params.id);
			const userId = Number(this.request.params.userId);
			const response = await this.eventsService.removeAttendee(eventId, userId);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getEventAttendees() {
		try {
			const id = Number(this.request.params.id);
			const response = await this.eventsService.getAttendees(id);
			return this.apiResponse.sendResponse(response);
		} catch (error: unknown) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
