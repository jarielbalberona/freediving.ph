import { and, desc, eq, ilike } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { marketplaceListings } from "@/models/drizzle/futureModules.model";
import { users } from "@/models/drizzle/authentication.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type { MarketplaceCreateSchemaType, MarketplaceModerateSchemaType, MarketplaceQuerySchemaType } from "./marketplace.validators";

export default class MarketplaceService extends DrizzleService {
  async list(query: MarketplaceQuerySchemaType) {
    try {
      const rows = await this.db.query.marketplaceListings.findMany({
        where: and(
          eq(marketplaceListings.state, "ACTIVE"),
          query.search ? ilike(marketplaceListings.item, `%${query.search}%`) : undefined,
          query.region ? ilike(marketplaceListings.region, `%${query.region}%`) : undefined,
        ),
        orderBy: desc(marketplaceListings.createdAt),
        limit: query.limit,
        offset: query.offset,
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Marketplace listings retrieved", rows);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async create(userId: number, payload: MarketplaceCreateSchemaType) {
    try {
      const userRow = await this.db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const createdAt = userRow[0]?.createdAt;
      if (!createdAt || Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Account must be at least 24h old to post listings");
      }

      const cooldownThreshold = new Date(Date.now() - 10 * 60 * 1000);
      const recent = await this.db.query.marketplaceListings.findMany({
        where: and(eq(marketplaceListings.sellerUserId, userId), eq(marketplaceListings.state, "ACTIVE")),
        orderBy: desc(marketplaceListings.createdAt),
        limit: 1,
      });
      if (recent[0]?.createdAt && recent[0].createdAt > cooldownThreshold) {
        return ServiceResponse.createRejectResponse(status.HTTP_429_TOO_MANY_REQUESTS, "Listing cooldown active. Please wait before posting again");
      }

      const suspiciousLinkPattern = /(t\.me|wa\.me|bit\.ly|tinyurl)/i;
      if (payload.description && suspiciousLinkPattern.test(payload.description)) {
        return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "Listing contains suspicious link patterns");
      }

      const created = await this.db
        .insert(marketplaceListings)
        .values({
          sellerUserId: userId,
          item: payload.item,
          condition: payload.condition,
          price: payload.price,
          region: payload.region,
          description: payload.description,
          photos: payload.photos,
          state: "ACTIVE",
        })
        .returning();
      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Marketplace listing created", created[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async moderate(id: number, payload: MarketplaceModerateSchemaType, actorUserId?: number) {
    try {
      const updated = await this.db
        .update(marketplaceListings)
        .set({ state: payload.state })
        .where(eq(marketplaceListings.id, id))
        .returning();
      if (!updated[0]) return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Listing not found");
      await this.db.insert(auditLogs).values({
        actorUserId: actorUserId ?? null,
        action: "MARKETPLACE_LISTING_MODERATED",
        targetType: "OTHER",
        targetId: `marketplace:${id}`,
        metadata: { state: payload.state },
      });
      return ServiceResponse.createResponse(status.HTTP_200_OK, "Listing moderation state updated", updated[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
