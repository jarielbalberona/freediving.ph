import { and, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { auditLogs, blocks } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type { BlockCreateSchemaType, BlockDeleteSchemaType } from "./blocks.validators";

export default class BlocksService extends DrizzleService {
  async list(currentUserId: number) {
    try {
      const rows = await this.db
        .select()
        .from(blocks)
        .where(eq(blocks.blockerUserId, currentUserId));

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Blocks retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async create(currentUserId: number, payload: BlockCreateSchemaType) {
    try {
      if (currentUserId === payload.blockedUserId) {
        return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "You cannot block yourself");
      }

      const existing = await this.db
        .select({ id: blocks.id })
        .from(blocks)
        .where(
          and(
            eq(blocks.blockerUserId, currentUserId),
            eq(blocks.blockedUserId, payload.blockedUserId),
            eq(blocks.scope, payload.scope)
          )
        )
        .limit(1);

      if (existing[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_409_CONFLICT, "Block already exists");
      }

      const created = await this.db
        .insert(blocks)
        .values({
          blockerUserId: currentUserId,
          blockedUserId: payload.blockedUserId,
          scope: payload.scope,
        })
        .returning();

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "USER_BLOCK_CREATED",
        targetType: "USER",
        targetId: String(payload.blockedUserId),
        metadata: { scope: payload.scope },
      });

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Block created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async delete(currentUserId: number, blockedUserId: number, query: BlockDeleteSchemaType) {
    try {
      const deleted = await this.db
        .delete(blocks)
        .where(
          and(
            eq(blocks.blockerUserId, currentUserId),
            eq(blocks.blockedUserId, blockedUserId),
            eq(blocks.scope, query.scope)
          )
        )
        .returning();

      if (!deleted[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Block not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "USER_BLOCK_REMOVED",
        targetType: "USER",
        targetId: String(blockedUserId),
        metadata: { scope: query.scope },
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Block removed", deleted[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
