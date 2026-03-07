import { and, desc, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { awarenessPosts } from "@/models/drizzle/futureModules.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type { AwarenessCreateSchemaType, AwarenessQuerySchemaType } from "./awareness.validators";

export default class AwarenessService extends DrizzleService {
  async list(query: AwarenessQuerySchemaType) {
    try {
      const rows = await this.db.query.awarenessPosts.findMany({
        where: and(eq(awarenessPosts.isPublished, 1), query.topicType ? eq(awarenessPosts.topicType, query.topicType) : undefined),
        orderBy: desc(awarenessPosts.createdAt),
        limit: query.limit,
        offset: query.offset,
      });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Awareness posts retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async create(userId: number, payload: AwarenessCreateSchemaType) {
    try {
      const created = await this.db
        .insert(awarenessPosts)
        .values({
          authorUserId: userId,
          title: payload.title,
          body: payload.body,
          topicType: payload.topicType,
          sourceUrl: payload.sourceUrl,
          isPublished: 1,
        })
        .returning();

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Awareness post created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
