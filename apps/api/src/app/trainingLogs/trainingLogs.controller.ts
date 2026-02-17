import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import TrainingLogsService from "./trainingLogs.service";
import {
  TrainingLogCreateSchema,
  TrainingLogQuerySchema,
  TrainingLogUpdateSchema,
  TrainingMetricUpsertSchema,
} from "./trainingLogs.validators";

export default class TrainingLogsController extends ApiController {
  private service: TrainingLogsService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.service = new TrainingLogsService();
  }

  async create() {
    try {
      const check = TrainingLogCreateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.create(this.request.user.id, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async list() {
    try {
      const check = TrainingLogQuerySchema.safeParse(this.request.query);
      if (!check.success) return this.validationError(check.error);
      return this.apiResponse.sendResponse(await this.service.list(this.request.user.id, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async updateSession() {
    try {
      const sessionId = Number(this.request.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) return this.apiResponse.badResponse("Invalid session id");

      const check = TrainingLogUpdateSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);

      return this.apiResponse.sendResponse(await this.service.updateSession(this.request.user.id, sessionId, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async deleteSession() {
    try {
      const sessionId = Number(this.request.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) return this.apiResponse.badResponse("Invalid session id");

      return this.apiResponse.sendResponse(await this.service.deleteSession(this.request.user.id, sessionId));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listMetrics() {
    try {
      const sessionId = Number(this.request.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) return this.apiResponse.badResponse("Invalid session id");

      return this.apiResponse.sendResponse(await this.service.listMetrics(this.request.user.id, sessionId));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async upsertMetric() {
    try {
      const sessionId = Number(this.request.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0) return this.apiResponse.badResponse("Invalid session id");

      const check = TrainingMetricUpsertSchema.safeParse(this.request.body);
      if (!check.success) return this.validationError(check.error);

      return this.apiResponse.sendResponse(await this.service.upsertMetric(this.request.user.id, sessionId, check.data));
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
