import type { Request, Response } from "express";

import { ApiController } from "@/controllers/base/api.controller";
import type { ServiceApiResponse } from "@/utils/serviceApi";

import MessagesService from "./messages.service";
import {
  ConversationMessagesQuerySchema,
  CreateDirectConversationSchema,
  ModerateRemoveMessageSchema,
  SendMessageSchema,
} from "./messages.validators";

export default class MessagesController extends ApiController {
  protected messagesService: MessagesService;

  constructor(request: Request, response: Response) {
    super(request, response);
    this.messagesService = new MessagesService();
  }

  async listConversations() {
    try {
      const currentUserId = this.request.user?.id;
      const response = await this.messagesService.listConversations(currentUserId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async createOrGetDirectConversation() {
    try {
      const body = this.request.body;
      const check = CreateDirectConversationSchema.safeParse(body);

      if (!check.success) {
        return this.validationError(check.error);
      }

      const currentUserId = this.request.user?.id;
      const response = await this.messagesService.createOrGetDirectConversation(currentUserId, check.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async listMessages() {
    try {
      const currentUserId = this.request.user?.id;
      const conversationId = Number(this.request.params.conversationId);
      const queryCheck = ConversationMessagesQuerySchema.safeParse(this.request.query);

      if (!queryCheck.success) {
        return this.apiResponse.badResponse(queryCheck.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.messagesService.listMessages(currentUserId, conversationId, queryCheck.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async sendMessage() {
    try {
      const currentUserId = this.request.user?.id;
      const conversationId = Number(this.request.params.conversationId);
      const bodyCheck = SendMessageSchema.safeParse(this.request.body);

      if (!bodyCheck.success) {
        return this.apiResponse.badResponse(bodyCheck.error.errors.map((err) => err.message).join("\n"));
      }

      const response = await this.messagesService.sendMessage(currentUserId, conversationId, bodyCheck.data);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async deleteOwnMessage() {
    try {
      const currentUserId = this.request.user?.id;
      const conversationId = Number(this.request.params.conversationId);
      const messageId = Number(this.request.params.messageId);

      const response = await this.messagesService.deleteOwnMessage(currentUserId, conversationId, messageId);
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }

  async moderateRemoveMessage() {
    try {
      const currentUserId = this.request.user?.id;
      const conversationId = Number(this.request.params.conversationId);
      const messageId = Number(this.request.params.messageId);
      const check = ModerateRemoveMessageSchema.safeParse(this.request.body);

      if (!check.success) {
        return this.validationError(check.error);
      }

      const response = await this.messagesService.moderateRemoveMessage(
        currentUserId,
        conversationId,
        messageId,
        check.data,
      );
      return this.apiResponse.sendResponse(response);
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
    }
  }
}
