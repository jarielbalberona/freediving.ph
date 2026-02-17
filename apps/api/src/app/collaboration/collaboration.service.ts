import { and, desc, eq, ilike } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { collaborationPosts } from "@/models/drizzle/futureModules.model";
import { users } from "@/models/drizzle/authentication.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  CollaborationCreateSchemaType,
  CollaborationModerateSchemaType,
  CollaborationQuerySchemaType,
} from "./collaboration.validators";

export default class CollaborationService extends DrizzleService {
  async list(query: CollaborationQuerySchemaType) {
    try {
      const rows = await this.db.query.collaborationPosts.findMany({
        where: and(
          eq(collaborationPosts.isActive, 1),
          query.postType ? eq(collaborationPosts.postType, query.postType) : undefined,
          query.region ? ilike(collaborationPosts.region, `%${query.region}%`) : undefined,
          query.specialty ? ilike(collaborationPosts.specialty, `%${query.specialty}%`) : undefined,
        ),
        orderBy: desc(collaborationPosts.createdAt),
        limit: query.limit,
        offset: query.offset,
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Collaboration posts retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async create(userId: number, payload: CollaborationCreateSchemaType) {
    try {
      const userRow = await this.db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const createdAt = userRow[0]?.createdAt;
      if (!createdAt || Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Account must be at least 24h old to post collaboration offers");
      }

      const recent = await this.db.query.collaborationPosts.findMany({
        where: and(eq(collaborationPosts.authorUserId, userId), eq(collaborationPosts.isActive, 1)),
        orderBy: desc(collaborationPosts.createdAt),
        limit: 1,
      });
      if (recent[0]?.createdAt && Date.now() - recent[0].createdAt.getTime() < 5 * 60 * 1000) {
        return ServiceResponse.createRejectResponse(status.HTTP_429_TOO_MANY_REQUESTS, "Posting cooldown active");
      }

      const created = await this.db
        .insert(collaborationPosts)
        .values({
          authorUserId: userId,
          postType: payload.postType,
          title: payload.title,
          body: payload.body,
          region: payload.region,
          specialty: payload.specialty,
          isActive: 1,
        })
        .returning();

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Collaboration post created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async moderate(id: number, payload: CollaborationModerateSchemaType, actorUserId?: number) {
    try {
      const updated = await this.db
        .update(collaborationPosts)
        .set({ isActive: payload.isActive ? 1 : 0 })
        .where(eq(collaborationPosts.id, id))
        .returning();

      if (!updated[0]) return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Post not found");
      await this.db.insert(auditLogs).values({
        actorUserId: actorUserId ?? null,
        action: "COLLABORATION_POST_MODERATED",
        targetType: "OTHER",
        targetId: `collaboration:${id}`,
        metadata: { isActive: payload.isActive, reasonCode: payload.reasonCode, note: payload.note ?? null },
      });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Collaboration moderation updated", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
