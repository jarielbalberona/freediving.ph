import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import BuddiesService from "./buddies.service";
import { BuddyFinderQuerySchema, RejectBuddyRequestSchema, SendBuddyRequestSchema } from "./buddies.validators";

export default class BuddiesController extends ApiController {
  protected buddiesService: BuddiesService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.buddiesService = new BuddiesService();
  }

  async sendRequest() {
    try {
      const check = SendBuddyRequestSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);

      const response = await this.buddiesService.sendRequest(this.request.user.id, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async cancelRequest() {
    try {
      const requestId = Number(this.request.params.requestId);
      const response = await this.buddiesService.cancelRequest(this.request.user.id, requestId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async acceptRequest() {
    try {
      const requestId = Number(this.request.params.requestId);
      const response = await this.buddiesService.acceptRequest(this.request.user.id, requestId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async rejectRequest() {
    try {
      const requestId = Number(this.request.params.requestId);
      const check = RejectBuddyRequestSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);

      const response = await this.buddiesService.rejectRequest(this.request.user.id, requestId, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listRequests() {
    try {
      const response = await this.buddiesService.listRequests(this.request.user.id);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listBuddies() {
    try {
      const response = await this.buddiesService.listActiveBuddies(this.request.user.id);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async removeBuddy() {
    try {
      const buddyUserId = Number(this.request.params.buddyUserId);
      const response = await this.buddiesService.removeBuddy(this.request.user.id, buddyUserId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async finder() {
    try {
      const check = BuddyFinderQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);

      const response = await this.buddiesService.finder(this.request.user.id, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
