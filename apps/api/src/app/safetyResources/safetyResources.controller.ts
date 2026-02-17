import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import SafetyResourcesService from "./safetyResources.service";
import {
  SafetyContactCreateSchema,
  SafetyPageCreateSchema,
  SafetyPageRollbackSchema,
  SafetyPageUpdateSchema,
} from "./safetyResources.validators";

export default class SafetyResourcesController extends ApiController {
  private service: SafetyResourcesService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new SafetyResourcesService();
  }

  async listPages() {
    try {
      return this.apiResponse.sendResponse(await this.service.listPages());
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listContacts() {
    try {
      return this.apiResponse.sendResponse(await this.service.listContacts());
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async createPage() {
    try {
      const check = SafetyPageCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.createPage(this.request.user.id, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async createContact() {
    try {
      const check = SafetyContactCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.createContact(check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async updatePage() {
    try {
      const id = Number(this.request.params.id);
      const check = SafetyPageUpdateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.updatePage(this.request.user.id, id, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async rollbackPage() {
    try {
      const id = Number(this.request.params.id);
      const check = SafetyPageRollbackSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.rollbackPage(this.request.user.id, id, check.data.versionId));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listStalePages() {
    try {
      const days = this.request.query.days ? Number(this.request.query.days) : 90;
      return this.apiResponse.sendResponse(await this.service.listStalePages(days));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
