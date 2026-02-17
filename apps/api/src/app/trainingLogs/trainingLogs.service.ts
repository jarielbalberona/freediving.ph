import { and, desc, eq, isNull } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { trainingLogMetrics, trainingLogSessions } from "@/models/drizzle/futureModules.model";
import { buddyRelationships } from "@/models/drizzle/buddies.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type { TrainingLogCreateSchemaType, TrainingLogQuerySchemaType } from "./trainingLogs.validators";
import type { TrainingLogUpdateSchemaType, TrainingMetricUpsertSchemaType } from "./trainingLogs.validators";

export default class TrainingLogsService extends DrizzleService {
  async create(userId: number, payload: TrainingLogCreateSchemaType) {
    try {
      const session = await this.db
        .insert(trainingLogSessions)
        .values({
          userId,
          title: payload.title,
          notes: payload.notes,
          sessionDate: payload.sessionDate,
          visibility: payload.visibility,
        })
        .returning();

      const sessionRow = session[0];
      if (!sessionRow) {
        return ServiceResponse.createRejectResponse(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to create training log");
      }

      if (payload.metrics.length > 0) {
        await this.db.insert(trainingLogMetrics).values(
          payload.metrics.map((metric) => ({
            sessionId: sessionRow.id,
            metricKey: metric.metricKey,
            metricValue: metric.metricValue,
            metricUnit: metric.metricUnit,
          })),
        );
      }

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Training log created", sessionRow);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async list(currentUserId: number, query: TrainingLogQuerySchemaType) {
    try {
      const ownerId = query.userId ?? currentUserId;
      const isOwner = ownerId === currentUserId;

      const relationship = isOwner
        ? true
        : await this.db
            .select({ id: buddyRelationships.id })
            .from(buddyRelationships)
            .where(
              and(
                eq(buddyRelationships.state, "ACTIVE"),
                eq(buddyRelationships.userIdA, Math.min(currentUserId, ownerId)),
                eq(buddyRelationships.userIdB, Math.max(currentUserId, ownerId)),
              ),
            )
            .limit(1);

      const allowBuddy = isOwner || (Array.isArray(relationship) && relationship.length > 0);

      const rows = await this.db.query.trainingLogSessions.findMany({
        where: and(
          eq(trainingLogSessions.userId, ownerId),
          isNull(trainingLogSessions.deletedAt),
          query.visibility
            ? eq(trainingLogSessions.visibility, query.visibility)
            : isOwner
              ? undefined
              : allowBuddy
                ? undefined
                : eq(trainingLogSessions.visibility, "PUBLIC"),
        ),
        orderBy: desc(trainingLogSessions.sessionDate),
        limit: query.limit,
        offset: query.offset,
      });

      const filtered = isOwner
        ? rows
        : rows.filter((row) => row.visibility === "PUBLIC" || (allowBuddy && row.visibility === "BUDDIES_ONLY"));

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Training logs retrieved", filtered);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async updateSession(currentUserId: number, sessionId: number, payload: TrainingLogUpdateSchemaType) {
    try {
      const updated = await this.db
        .update(trainingLogSessions)
        .set(payload)
        .where(and(eq(trainingLogSessions.id, sessionId), eq(trainingLogSessions.userId, currentUserId), isNull(trainingLogSessions.deletedAt)))
        .returning();
      if (!updated[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Training session not found");
      }
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Training session updated", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async deleteSession(currentUserId: number, sessionId: number) {
    try {
      const deleted = await this.db
        .update(trainingLogSessions)
        .set({ deletedAt: new Date() })
        .where(and(eq(trainingLogSessions.id, sessionId), eq(trainingLogSessions.userId, currentUserId), isNull(trainingLogSessions.deletedAt)))
        .returning();
      if (!deleted[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Training session not found");
      }
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Training session deleted", deleted[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listMetrics(currentUserId: number, sessionId: number) {
    try {
      const session = await this.db.query.trainingLogSessions.findFirst({
        where: and(eq(trainingLogSessions.id, sessionId), eq(trainingLogSessions.userId, currentUserId), isNull(trainingLogSessions.deletedAt)),
      });
      if (!session) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Training session not found");
      }
      const metrics = await this.db.query.trainingLogMetrics.findMany({ where: eq(trainingLogMetrics.sessionId, sessionId) });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Training metrics retrieved", metrics);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async upsertMetric(currentUserId: number, sessionId: number, payload: TrainingMetricUpsertSchemaType) {
    try {
      const session = await this.db.query.trainingLogSessions.findFirst({
        where: and(eq(trainingLogSessions.id, sessionId), eq(trainingLogSessions.userId, currentUserId), isNull(trainingLogSessions.deletedAt)),
      });
      if (!session) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Training session not found");
      }

      const existing = await this.db.query.trainingLogMetrics.findFirst({
        where: and(eq(trainingLogMetrics.sessionId, sessionId), eq(trainingLogMetrics.metricKey, payload.metricKey)),
      });

      if (existing) {
        const updated = await this.db
          .update(trainingLogMetrics)
          .set({ metricValue: payload.metricValue, metricUnit: payload.metricUnit })
          .where(eq(trainingLogMetrics.id, existing.id))
          .returning();
        return ServiceResponse.createResponse(status.HTTP_200_OK, "Training metric updated", updated[0]);
      }

      const created = await this.db
        .insert(trainingLogMetrics)
        .values({
          sessionId,
          metricKey: payload.metricKey,
          metricValue: payload.metricValue,
          metricUnit: payload.metricUnit,
        })
        .returning();
      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Training metric created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
