import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import MarketplaceService from "./marketplace.service";
import { MarketplaceCreateSchema, MarketplaceModerateSchema, MarketplaceQuerySchema } from "./marketplace.validators";

export default class MarketplaceController extends ApiController {
  private service: MarketplaceService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new MarketplaceService();
  }

  async list() {
    try {
      const check = MarketplaceQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.list(check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async create() {
    try {
      const check = MarketplaceCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.context!.appUserId!, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async moderate() {
    try {
      const id = Number(this.request.params.id);
      const check = MarketplaceModerateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.moderate(id, check.data, this.request.context!.appUserId!));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
