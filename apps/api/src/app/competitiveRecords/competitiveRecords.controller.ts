import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import CompetitiveRecordsService from "./competitiveRecords.service";
import {
  CompetitiveRecordCreateSchema,
  CompetitiveRecordQuerySchema,
  CompetitiveRecordVerifySchema,
} from "./competitiveRecords.validators";

export default class CompetitiveRecordsController extends ApiController {
  private service: CompetitiveRecordsService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new CompetitiveRecordsService();
  }

  async list() {
    try {
      const check = CompetitiveRecordQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.list(check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async create() {
    try {
      const check = CompetitiveRecordCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.context!.appUserId!, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async moderate() {
    try {
      const recordId = Number(this.request.params.id);
      const check = CompetitiveRecordVerifySchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.verify(recordId, this.request.context!.appUserId!, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
