import { and, desc, eq, ilike } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { competitiveRecords } from "@/models/drizzle/futureModules.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  CompetitiveRecordCreateSchemaType,
  CompetitiveRecordQuerySchemaType,
  CompetitiveRecordVerifySchemaType,
} from "./competitiveRecords.validators";

export default class CompetitiveRecordsService extends DrizzleService {
  async list(query: CompetitiveRecordQuerySchemaType) {
    try {
      const rows = await this.db.query.competitiveRecords.findMany({
        where: and(
          query.discipline ? ilike(competitiveRecords.discipline, `%${query.discipline}%`) : undefined,
          query.athlete ? ilike(competitiveRecords.athleteName, `%${query.athlete}%`) : undefined,
          query.eventName ? ilike(competitiveRecords.eventName, `%${query.eventName}%`) : undefined,
        ),
        orderBy: desc(competitiveRecords.eventDate),
        limit: query.limit,
        offset: query.offset,
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Competitive records retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async create(userId: number, payload: CompetitiveRecordCreateSchemaType) {
    try {
      const unitByDiscipline: Record<string, string[]> = {
        STA: ["sec", "s"],
        DYN: ["m"],
        DYNB: ["m"],
        DNF: ["m"],
        CWT: ["m"],
        CWTB: ["m"],
        FIM: ["m"],
        CNF: ["m"],
      };

      const allowedUnits = unitByDiscipline[payload.discipline];
      if (allowedUnits && !allowedUnits.map((unit) => unit.toLowerCase()).includes(payload.resultUnit.toLowerCase())) {
        return ServiceResponse.createRejectResponse(
          status.HTTP_400_BAD_REQUEST,
          `Invalid unit for discipline ${payload.discipline}`,
        );
      }

      const existing = await this.db
        .select({ id: competitiveRecords.id })
        .from(competitiveRecords)
        .where(
          and(
            eq(competitiveRecords.athleteName, payload.athleteName),
            eq(competitiveRecords.discipline, payload.discipline),
            eq(competitiveRecords.eventName, payload.eventName),
            eq(competitiveRecords.eventDate, payload.eventDate),
          ),
        )
        .limit(1);

      if (existing[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_409_CONFLICT, "Possible duplicate record submission detected");
      }

      const created = await this.db
        .insert(competitiveRecords)
        .values({
          submittedByUserId: userId,
          athleteName: payload.athleteName,
          discipline: payload.discipline,
          resultValue: payload.resultValue,
          resultUnit: payload.resultUnit,
          eventName: payload.eventName,
          eventDate: payload.eventDate,
          sourceUrl: payload.sourceUrl,
          verificationState: "UNVERIFIED",
        })
        .returning();

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Competitive record submitted", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async verify(recordId: number, moderatorId: number, payload: CompetitiveRecordVerifySchemaType) {
    try {
      const update =
        payload.action === "VERIFY"
          ? { verificationState: "VERIFIED" as const, verificationNote: payload.note ?? null, verifiedByUserId: moderatorId }
          : payload.action === "REJECT"
            ? { verificationState: "REJECTED" as const, verificationNote: payload.note ?? null, verifiedByUserId: moderatorId }
            : { verificationState: "REJECTED" as const, verificationNote: payload.note ?? "Removed by moderator", verifiedByUserId: moderatorId };

      const updated = await this.db
        .update(competitiveRecords)
        .set(update)
        .where(eq(competitiveRecords.id, recordId))
        .returning();

      if (!updated[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Competitive record not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: moderatorId,
        action: "COMPETITIVE_RECORD_MODERATED",
        targetType: "COMPETITIVE_RECORD",
        targetId: String(recordId),
        metadata: {
          action: payload.action,
          note: payload.note ?? null,
        },
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Competitive record moderation updated", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
