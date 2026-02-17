import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import BuddiesService from "./buddies.service";
import {
  BuddyFinderQuerySchema,
  BuddyListQuerySchema,
  RejectBuddyRequestSchema,
  SendBuddyRequestSchema,
} from "./buddies.validators";

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

      const response = await this.buddiesService.sendRequest(this.request.context!.appUserId!, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async cancelRequest() {
    try {
      const requestId = Number(this.request.params.requestId);
      const response = await this.buddiesService.cancelRequest(this.request.context!.appUserId!, requestId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async acceptRequest() {
    try {
      const requestId = Number(this.request.params.requestId);
      const response = await this.buddiesService.acceptRequest(this.request.context!.appUserId!, requestId);
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

      const response = await this.buddiesService.rejectRequest(this.request.context!.appUserId!, requestId, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listRequests() {
    try {
      const check = BuddyListQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      const response = await this.buddiesService.listRequests(this.request.context!.appUserId!, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listBuddies() {
    try {
      const check = BuddyListQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      const response = await this.buddiesService.listActiveBuddies(this.request.context!.appUserId!, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async removeBuddy() {
    try {
      const buddyUserId = Number(this.request.params.buddyUserId);
      const response = await this.buddiesService.removeBuddy(this.request.context!.appUserId!, buddyUserId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async finder() {
    try {
      const check = BuddyFinderQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);

      const response = await this.buddiesService.finder(this.request.context!.appUserId!, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
