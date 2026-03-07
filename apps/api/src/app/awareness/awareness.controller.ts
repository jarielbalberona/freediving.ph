import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import AwarenessService from "./awareness.service";
import { AwarenessCreateSchema, AwarenessQuerySchema } from "./awareness.validators";

export default class AwarenessController extends ApiController {
  private service: AwarenessService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new AwarenessService();
  }

  async list() {
    try {
      const check = AwarenessQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.list(check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async create() {
    try {
      const check = AwarenessCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.context!.appUserId!, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
