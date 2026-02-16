import { desc, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { safetyContacts, safetyPages, safetyPageVersions } from "@/models/drizzle/futureModules.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  SafetyContactCreateSchemaType,
  SafetyPageCreateSchemaType,
  SafetyPageUpdateSchemaType,
} from "./safetyResources.validators";

export default class SafetyResourcesService extends DrizzleService {
  async listPages() {
    try {
      const rows = await this.db.query.safetyPages.findMany({
        where: eq(safetyPages.isPublished, 1),
        orderBy: desc(safetyPages.updatedAt),
      });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Safety pages retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listContacts() {
    try {
      const rows = await this.db.query.safetyContacts.findMany({
        where: eq(safetyContacts.isPublished, 1),
        orderBy: desc(safetyContacts.region),
      });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Safety contacts retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async createPage(userId: number, payload: SafetyPageCreateSchemaType) {
    try {
      const created = await this.db
        .insert(safetyPages)
        .values({
          slug: payload.slug,
          title: payload.title,
          content: payload.content,
          isPublished: payload.isPublished ? 1 : 0,
          lastReviewedAt: new Date(),
          updatedByUserId: userId,
        })
        .returning();
      if (created[0]) {
        await this.db.insert(safetyPageVersions).values({
          safetyPageId: created[0].id,
          title: created[0].title,
          content: created[0].content,
          updatedByUserId: userId,
        });
      }
      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Safety page created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async createContact(payload: SafetyContactCreateSchemaType) {
    try {
      const created = await this.db
        .insert(safetyContacts)
        .values({
          region: payload.region,
          label: payload.label,
          phone: payload.phone,
          source: payload.source,
          isPublished: payload.isPublished ? 1 : 0,
        })
        .returning();
      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Safety contact created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async updatePage(userId: number, id: number, payload: SafetyPageUpdateSchemaType) {
    try {
      const existing = await this.db.query.safetyPages.findFirst({ where: eq(safetyPages.id, id) });
      if (!existing) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Safety page not found");
      }

      const updated = await this.db
        .update(safetyPages)
        .set({
          ...payload,
          isPublished: payload.isPublished === undefined ? undefined : payload.isPublished ? 1 : 0,
          lastReviewedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(eq(safetyPages.id, id))
        .returning();

      if (updated[0]) {
        await this.db.insert(safetyPageVersions).values({
          safetyPageId: updated[0].id,
          title: updated[0].title,
          content: updated[0].content,
          updatedByUserId: userId,
        });
      }

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Safety page updated", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async rollbackPage(userId: number, id: number, versionId: number) {
    try {
      const version = await this.db.query.safetyPageVersions.findFirst({
        where: eq(safetyPageVersions.id, versionId),
      });
      if (!version || version.safetyPageId !== id) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Version not found for this page");
      }

      const updated = await this.db
        .update(safetyPages)
        .set({
          title: version.title,
          content: version.content,
          updatedByUserId: userId,
          lastReviewedAt: new Date(),
        })
        .where(eq(safetyPages.id, id))
        .returning();

      await this.db.insert(auditLogs).values({
        actorUserId: userId,
        action: "SAFETY_PAGE_ROLLBACK",
        targetType: "SAFETY_PAGE",
        targetId: String(id),
        metadata: { versionId },
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Safety page rolled back", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listStalePages(days = 90) {
    try {
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const rows = await this.db.query.safetyPages.findMany({
        where: eq(safetyPages.isPublished, 1),
      });
      const stale = rows.filter((row) => !row.lastReviewedAt || row.lastReviewedAt < threshold);
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Stale safety pages retrieved", stale);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
