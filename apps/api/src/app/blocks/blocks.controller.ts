import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import BlocksService from "./blocks.service";
import { BlockCreateSchema, BlockDeleteSchema } from "./blocks.validators";

export default class BlocksController extends ApiController {
  private service: BlocksService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new BlocksService();
  }

  async list() {
    try {
      return this.apiResponse.sendResponse(await this.service.list(this.request.context!.appUserId!));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async create() {
    try {
      const check = BlockCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.context!.appUserId!, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async delete() {
    try {
      const blockedUserId = Number(this.request.params.blockedUserId);
      const check = BlockDeleteSchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.delete(this.request.context!.appUserId!, blockedUserId, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
