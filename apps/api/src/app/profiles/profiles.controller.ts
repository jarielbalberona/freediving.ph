import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import ProfilesService from "./profiles.service";
import {
  CreatePersonalBestSchema,
  UpdateOwnProfileSchema,
  UpdatePersonalBestSchema,
} from "./profiles.validators";

export default class ProfilesController extends ApiController {
  protected profilesService: ProfilesService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.profilesService = new ProfilesService();
  }

  async getProfileByUsername() {
    try {
      const username = String(this.request.params.username);
      const viewerUserId = this.request.user?.id ?? null;
      const response = await this.profilesService.getByUsername(viewerUserId, username);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async updateOwnProfile() {
    try {
      const check = UpdateOwnProfileSchema.safeParse(this.request.body);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.profilesService.updateOwnProfile(this.request.user.id, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async createPersonalBest() {
    try {
      const check = CreatePersonalBestSchema.safeParse(this.request.body);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.profilesService.createPersonalBest(this.request.user.id, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async updatePersonalBest() {
    try {
      const personalBestId = Number(this.request.params.id);
      const check = UpdatePersonalBestSchema.safeParse(this.request.body);
      if (!check.success) {
        return this.apiResponse.badResponse(check.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.profilesService.updatePersonalBest(this.request.user.id, personalBestId, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async deletePersonalBest() {
    try {
      const personalBestId = Number(this.request.params.id);
      const response = await this.profilesService.deletePersonalBest(this.request.user.id, personalBestId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
