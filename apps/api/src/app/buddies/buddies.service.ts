import { and, count, desc, eq, gte, ilike, inArray, isNull, ne, not, or } from "drizzle-orm";

import { ABUSE_LIMITS } from "@/core/abuseControls";
import { getPlatformBlockedUserIds, isPlatformBlockedBetween } from "@/core/blocking";
import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { buddyRelationships, buddyRequests } from "@/models/drizzle/buddies.model";
import { diveSpots } from "@/models/drizzle/diveSpots.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { buildOffsetPagination } from "@/utils/pagination";

import type {
  BuddyListQuerySchemaType,
  BuddyFinderQuerySchemaType,
  RejectBuddyRequestSchemaType,
  SendBuddyRequestSchemaType,
  BuddyAvailabilityQuerySchemaType,
} from "./buddies.validators";

const normalizePair = (a: number, b: number) => (a < b ? { userIdA: a, userIdB: b } : { userIdA: b, userIdB: a });

export default class BuddiesService extends DrizzleService {
  private toCoarseLocation(value: string | null | undefined) {
    if (!value) return null;
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return null;
    const segments = normalized
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const coarse = segments.slice(0, 2).join(", ");
    return coarse.slice(0, 120);
  }

  private sanitizeBuddyProfileLocation<T extends { location?: string | null; homeDiveArea?: string | null }>(profile: T) {
    const coarseLocation = this.toCoarseLocation(profile.homeDiveArea ?? profile.location ?? null);
    return {
      ...profile,
      location: coarseLocation,
      homeDiveArea: coarseLocation,
    };
  }

  private async hasBlockingRelationship(userA: number, userB: number) {
    return isPlatformBlockedBetween(this.db, userA, userB);
  }

  async sendRequest(currentUserId: number, payload: SendBuddyRequestSchemaType) {
    try {
      if (currentUserId === payload.toUserId) {
        return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "Cannot send buddy request to yourself");
      }

      const isBlocked = await this.hasBlockingRelationship(currentUserId, payload.toUserId);
      if (isBlocked) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Cannot send request due to block relationship");
      }

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const dailyCountRows = await this.db
        .select({ total: count(buddyRequests.id) })
        .from(buddyRequests)
        .where(and(eq(buddyRequests.fromUserId, currentUserId), gte(buddyRequests.createdAt, todayStart)));

      if ((dailyCountRows[0]?.total ?? 0) >= ABUSE_LIMITS.buddyRequestsPerDay) {
        return ServiceResponse.createRejectResponse(status.HTTP_429_TOO_MANY_REQUESTS, "Daily buddy request limit reached");
      }

      const cooldownThreshold = new Date(
        Date.now() - ABUSE_LIMITS.buddyRequestRejectionCooldownDays * 24 * 60 * 60 * 1000
      );
      const rejectedRows = await this.db
        .select({ id: buddyRequests.id })
        .from(buddyRequests)
        .where(
          and(
            eq(buddyRequests.fromUserId, currentUserId),
          eq(buddyRequests.toUserId, payload.toUserId),
          eq(buddyRequests.state, "REJECTED"),
            gte(buddyRequests.updatedAt, cooldownThreshold),
          ),
        )
        .limit(1);

      if (rejectedRows.length > 0) {
        return ServiceResponse.createRejectResponse(
          status.HTTP_409_CONFLICT,
          `Cannot resend request until ${ABUSE_LIMITS.buddyRequestRejectionCooldownDays} days after rejection`,
        );
      }

      const pair = normalizePair(currentUserId, payload.toUserId);
      const existingRelationship = await this.db
        .select({ id: buddyRelationships.id })
        .from(buddyRelationships)
        .where(and(eq(buddyRelationships.userIdA, pair.userIdA), eq(buddyRelationships.userIdB, pair.userIdB)))
        .limit(1);

      if (existingRelationship.length > 0) {
        return ServiceResponse.createRejectResponse(status.HTTP_409_CONFLICT, "Users are already buddies");
      }

      const existingPending = await this.db
        .select({ id: buddyRequests.id })
        .from(buddyRequests)
        .where(
          and(
            eq(buddyRequests.fromUserId, currentUserId),
            eq(buddyRequests.toUserId, payload.toUserId),
            eq(buddyRequests.state, "PENDING"),
          ),
        )
        .limit(1);

      if (existingPending.length > 0) {
        return ServiceResponse.createRejectResponse(status.HTTP_409_CONFLICT, "Buddy request is already pending");
      }

      const created = await this.db
        .insert(buddyRequests)
        .values({
          fromUserId: currentUserId,
          toUserId: payload.toUserId,
          state: "PENDING",
        })
        .returning();

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "BUDDY_REQUEST_SENT",
        targetType: "USER",
        targetId: String(payload.toUserId),
        metadata: { requestId: created[0]?.id ?? null }
      });

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Buddy request sent", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async cancelRequest(currentUserId: number, requestId: number) {
    try {
      const updated = await this.db
        .update(buddyRequests)
        .set({ state: "CANCELED" })
        .where(and(eq(buddyRequests.id, requestId), eq(buddyRequests.fromUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .returning();

      if (!updated[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Pending request not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "BUDDY_REQUEST_CANCELED",
        targetType: "OTHER",
        targetId: String(requestId),
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy request canceled", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async acceptRequest(currentUserId: number, requestId: number) {
    try {
      const result = await this.db.transaction(async (tx) => {
        const requestRows = await tx
          .select()
          .from(buddyRequests)
          .where(and(eq(buddyRequests.id, requestId), eq(buddyRequests.toUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
          .limit(1);

        const request = requestRows[0];
        if (!request) {
          return null;
        }

        const pair = normalizePair(request.fromUserId, request.toUserId);

        await tx.insert(buddyRelationships).values({
          userIdA: pair.userIdA,
          userIdB: pair.userIdB,
          state: "ACTIVE",
        });

        const updated = await tx
          .update(buddyRequests)
          .set({ state: "ACCEPTED" })
          .where(eq(buddyRequests.id, requestId))
          .returning();

        return updated[0] ?? null;
      });

      if (!result) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Pending request not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "BUDDY_REQUEST_ACCEPTED",
        targetType: "OTHER",
        targetId: String(requestId),
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy request accepted", result);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async rejectRequest(currentUserId: number, requestId: number, payload: RejectBuddyRequestSchemaType) {
    try {
      const updated = await this.db
        .update(buddyRequests)
        .set({
          state: "REJECTED",
          rejectionReason: payload.reason ?? null,
        })
        .where(and(eq(buddyRequests.id, requestId), eq(buddyRequests.toUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .returning();

      if (!updated[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Pending request not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "BUDDY_REQUEST_REJECTED",
        targetType: "OTHER",
        targetId: String(requestId),
        metadata: { reason: payload.reason ?? null }
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy request rejected", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listRequests(currentUserId: number, query: BuddyListQuerySchemaType) {
    try {
      const [incomingCountRows, outgoingCountRows] = await Promise.all([
        this.db
          .select({ total: count(buddyRequests.id) })
          .from(buddyRequests)
          .where(and(eq(buddyRequests.toUserId, currentUserId), eq(buddyRequests.state, "PENDING"))),
        this.db
          .select({ total: count(buddyRequests.id) })
          .from(buddyRequests)
          .where(and(eq(buddyRequests.fromUserId, currentUserId), eq(buddyRequests.state, "PENDING"))),
      ]);

      const incomingTotal = incomingCountRows[0]?.total ?? 0;
      const outgoingTotal = outgoingCountRows[0]?.total ?? 0;

      const incoming = await this.db
        .select({
          request: buddyRequests,
          fromUser: {
            id: users.id,
            username: users.username,
            alias: users.alias,
            image: users.image,
            location: users.location,
            homeDiveArea: users.homeDiveArea,
          },
        })
        .from(buddyRequests)
        .leftJoin(users, eq(buddyRequests.fromUserId, users.id))
        .where(and(eq(buddyRequests.toUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .orderBy(desc(buddyRequests.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      const outgoing = await this.db
        .select({
          request: buddyRequests,
          toUser: {
            id: users.id,
            username: users.username,
            alias: users.alias,
            image: users.image,
            location: users.location,
            homeDiveArea: users.homeDiveArea,
          },
        })
        .from(buddyRequests)
        .leftJoin(users, eq(buddyRequests.toUserId, users.id))
        .where(and(eq(buddyRequests.fromUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .orderBy(desc(buddyRequests.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      return ServiceResponse.createResponse(
        status.HTTP_200_OK,
        "Buddy requests retrieved",
        {
          incoming: incoming.map((row) => ({
            ...row,
            fromUser: row.fromUser ? this.sanitizeBuddyProfileLocation(row.fromUser) : null,
          })),
          outgoing: outgoing.map((row) => ({
            ...row,
            toUser: row.toUser ? this.sanitizeBuddyProfileLocation(row.toUser) : null,
          })),
          incomingPagination: buildOffsetPagination(incomingTotal, query.limit, query.offset),
          outgoingPagination: buildOffsetPagination(outgoingTotal, query.limit, query.offset),
        },
        buildOffsetPagination(incomingTotal + outgoingTotal, query.limit, query.offset),
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listActiveBuddies(currentUserId: number, query: BuddyListQuerySchemaType) {
    try {
      const totalRows = await this.db
        .select({ total: count(buddyRelationships.id) })
        .from(buddyRelationships)
        .where(
          and(
            eq(buddyRelationships.state, "ACTIVE"),
            or(eq(buddyRelationships.userIdA, currentUserId), eq(buddyRelationships.userIdB, currentUserId)),
          ),
        );
      const totalItems = totalRows[0]?.total ?? 0;

      const relationships = await this.db
        .select({
          userIdA: buddyRelationships.userIdA,
          userIdB: buddyRelationships.userIdB,
        })
        .from(buddyRelationships)
        .where(
          and(
            eq(buddyRelationships.state, "ACTIVE"),
            or(eq(buddyRelationships.userIdA, currentUserId), eq(buddyRelationships.userIdB, currentUserId)),
          ),
        )
        .orderBy(desc(buddyRelationships.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      const buddyIds = relationships.map((row) =>
        row.userIdA === currentUserId ? row.userIdB : row.userIdA,
      );

      const buddies = buddyIds.length
        ? await this.db
            .select({
              id: users.id,
              username: users.username,
              alias: users.alias,
              image: users.image,
              location: users.location,
              experienceLevel: users.experienceLevel,
              homeDiveArea: users.homeDiveArea,
            })
            .from(users)
            .where(or(...buddyIds.map((id) => eq(users.id, id))))
        : [];

      return ServiceResponse.createResponse(
        status.HTTP_200_OK,
        "Active buddies retrieved",
        buddies.map((buddy) => this.sanitizeBuddyProfileLocation(buddy)),
        buildOffsetPagination(totalItems, query.limit, query.offset),
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async removeBuddy(currentUserId: number, buddyUserId: number) {
    try {
      const pair = normalizePair(currentUserId, buddyUserId);
      const deleted = await this.db
        .delete(buddyRelationships)
        .where(and(eq(buddyRelationships.userIdA, pair.userIdA), eq(buddyRelationships.userIdB, pair.userIdB)))
        .returning();

      if (!deleted[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Buddy relationship not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: currentUserId,
        action: "BUDDY_REMOVED",
        targetType: "USER",
        targetId: String(buddyUserId),
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy removed", deleted[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async finder(currentUserId: number, query: BuddyFinderQuerySchemaType) {
    try {
      const blockedUserIds = await getPlatformBlockedUserIds(this.db, currentUserId);
      const blockedIds = Array.from(blockedUserIds);
      const notBlockedFilter = blockedIds.length ? not(inArray(users.id, blockedIds)) : undefined;
      const totalRows = await this.db
        .select({ total: count(users.id) })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            eq(users.accountStatus, "ACTIVE"),
            eq(users.buddyFinderVisibility, "VISIBLE"),
            query.search
              ? or(
                  ilike(users.username, `%${query.search}%`),
                  ilike(users.alias, `%${query.search}%`),
                  ilike(users.name, `%${query.search}%`),
                )
              : undefined,
            query.experienceLevel ? ilike(users.experienceLevel, `%${query.experienceLevel}%`) : undefined,
            query.location
              ? or(ilike(users.location, `%${query.location}%`), ilike(users.homeDiveArea, `%${query.location}%`))
              : undefined,
            notBlockedFilter,
          ),
        );

      const results = await this.db
        .select({
          id: users.id,
          username: users.username,
          alias: users.alias,
          image: users.image,
          location: users.location,
          homeDiveArea: users.homeDiveArea,
          experienceLevel: users.experienceLevel,
        })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            eq(users.accountStatus, "ACTIVE"),
            eq(users.buddyFinderVisibility, "VISIBLE"),
            query.search
              ? or(
                  ilike(users.username, `%${query.search}%`),
                  ilike(users.alias, `%${query.search}%`),
                  ilike(users.name, `%${query.search}%`),
                )
              : undefined,
            query.experienceLevel ? ilike(users.experienceLevel, `%${query.experienceLevel}%`) : undefined,
            query.location
              ? or(ilike(users.location, `%${query.location}%`), ilike(users.homeDiveArea, `%${query.location}%`))
              : undefined,
            notBlockedFilter,
          ),
        )
        .limit(query.limit)
        .offset(query.offset);

      const filtered = results.map((user) => this.sanitizeBuddyProfileLocation(user));

      return ServiceResponse.createResponse(
        status.HTTP_200_OK,
        "Buddy finder results retrieved",
        filtered,
        buildOffsetPagination(totalRows[0]?.total ?? 0, query.limit, query.offset),
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async availableNearDiveSpot(currentUserId: number, query: BuddyAvailabilityQuerySchemaType) {
    try {
      const diveSpot = await this.db.query.diveSpots.findFirst({
        where: and(eq(diveSpots.id, query.diveSpotId), eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt)),
        columns: {
          locationName: true,
          name: true
        }
      });
      if (!diveSpot) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
      }

      const locationTerm = (diveSpot.locationName ?? diveSpot.name ?? "").trim();
      if (!locationTerm) {
        return ServiceResponse.createResponse(
          status.HTTP_200_OK,
          "No dive spot location available for buddy matching",
          [],
          buildOffsetPagination(0, query.limit, query.offset),
        );
      }

      const blockedUserIds = await getPlatformBlockedUserIds(this.db, currentUserId);
      const blockedIds = Array.from(blockedUserIds);
      const notBlockedFilter = blockedIds.length ? not(inArray(users.id, blockedIds)) : undefined;

      const totalRows = await this.db
        .select({ total: count(users.id) })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            eq(users.accountStatus, "ACTIVE"),
            eq(users.buddyFinderVisibility, "VISIBLE"),
            or(ilike(users.location, `%${locationTerm}%`), ilike(users.homeDiveArea, `%${locationTerm}%`)),
            notBlockedFilter,
          ),
        );

      const results = await this.db
        .select({
          id: users.id,
          username: users.username,
          alias: users.alias,
          image: users.image,
          location: users.location,
          homeDiveArea: users.homeDiveArea,
          experienceLevel: users.experienceLevel,
        })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            eq(users.accountStatus, "ACTIVE"),
            eq(users.buddyFinderVisibility, "VISIBLE"),
            or(ilike(users.location, `%${locationTerm}%`), ilike(users.homeDiveArea, `%${locationTerm}%`)),
            notBlockedFilter,
          ),
        )
        .limit(query.limit)
        .offset(query.offset);

      return ServiceResponse.createResponse(
        status.HTTP_200_OK,
        "Nearby buddy availability retrieved",
        results.map((user) => this.sanitizeBuddyProfileLocation(user)),
        buildOffsetPagination(totalRows[0]?.total ?? 0, query.limit, query.offset),
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
