import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import CollaborationService from "./collaboration.service";
import {
  CollaborationCreateSchema,
  CollaborationModerateSchema,
  CollaborationQuerySchema,
} from "./collaboration.validators";

export default class CollaborationController extends ApiController {
  private service: CollaborationService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new CollaborationService();
  }

  async list() {
    try {
      const check = CollaborationQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.list(check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async create() {
    try {
      const check = CollaborationCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.user.id, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async moderate() {
    try {
      const id = Number(this.request.params.id);
      const check = CollaborationModerateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.moderate(id, check.data, this.request.user.id));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
