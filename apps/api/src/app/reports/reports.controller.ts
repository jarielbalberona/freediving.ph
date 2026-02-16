import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import ReportsService from "./reports.service";
import {
  CreateReportSchema,
  ReportQuerySchema,
  UpdateReportStatusSchema,
} from "./reports.validators";

export default class ReportsController extends ApiController {
  protected reportsService: ReportsService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.reportsService = new ReportsService();
  }

  async createReport() {
    try {
      const check = CreateReportSchema.safeParse(this.request.body);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.reportsService.create(this.request.user.id, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listReports() {
    try {
      const check = ReportQuerySchema.safeParse(this.request.query);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.reportsService.list(check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async updateReportStatus() {
    try {
      const reportId = Number(this.request.params.id);
      const check = UpdateReportStatusSchema.safeParse(this.request.body);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.reportsService.updateStatus(this.request.user.id, reportId, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
