import { and, count, desc, eq, gte, ilike, ne, or } from "drizzle-orm";

import { ABUSE_LIMITS } from "@/core/abuseControls";
import { getPlatformBlockedUserIds, isPlatformBlockedBetween } from "@/core/blocking";
import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { buddyRelationships, buddyRequests } from "@/models/drizzle/buddies.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  BuddyFinderQuerySchemaType,
  RejectBuddyRequestSchemaType,
  SendBuddyRequestSchemaType,
} from "./buddies.validators";

const normalizePair = (a: number, b: number) => (a < b ? { userIdA: a, userIdB: b } : { userIdA: b, userIdB: a });

export default class BuddiesService extends DrizzleService {
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

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy request rejected", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listRequests(currentUserId: number) {
    try {
      const incoming = await this.db
        .select({
          request: buddyRequests,
          fromUser: {
            id: users.id,
            username: users.username,
            alias: users.alias,
            image: users.image,
          },
        })
        .from(buddyRequests)
        .leftJoin(users, eq(buddyRequests.fromUserId, users.id))
        .where(and(eq(buddyRequests.toUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .orderBy(desc(buddyRequests.createdAt));

      const outgoing = await this.db
        .select({
          request: buddyRequests,
          toUser: {
            id: users.id,
            username: users.username,
            alias: users.alias,
            image: users.image,
          },
        })
        .from(buddyRequests)
        .leftJoin(users, eq(buddyRequests.toUserId, users.id))
        .where(and(eq(buddyRequests.fromUserId, currentUserId), eq(buddyRequests.state, "PENDING")))
        .orderBy(desc(buddyRequests.createdAt));

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy requests retrieved", { incoming, outgoing });
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listActiveBuddies(currentUserId: number) {
    try {
      const rows = await this.db
        .select({
          relationship: buddyRelationships,
          userA: {
            id: users.id,
            username: users.username,
            alias: users.alias,
            image: users.image,
            location: users.location,
            experienceLevel: users.experienceLevel,
          },
        })
        .from(buddyRelationships)
        .leftJoin(users, eq(buddyRelationships.userIdA, users.id))
        .where(
          and(
            eq(buddyRelationships.state, "ACTIVE"),
            or(eq(buddyRelationships.userIdA, currentUserId), eq(buddyRelationships.userIdB, currentUserId)),
          ),
        )
        .orderBy(desc(buddyRelationships.createdAt));

      const buddyIds = rows.map((row) =>
        row.relationship.userIdA === currentUserId ? row.relationship.userIdB : row.relationship.userIdA,
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

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Active buddies retrieved", buddies);
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

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy removed", deleted[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async finder(currentUserId: number, query: BuddyFinderQuerySchemaType) {
    try {
      const blockedUserIds = await getPlatformBlockedUserIds(this.db, currentUserId);

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
          ),
        )
        .limit(query.limit)
        .offset(query.offset);

      const filtered = results.filter((user) => !blockedUserIds.has(user.id));

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Buddy finder results retrieved", filtered);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
