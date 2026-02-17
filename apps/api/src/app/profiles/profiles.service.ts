import { and, desc, eq, isNull } from "drizzle-orm";

import { isPlatformBlockedBetween } from "@/core/blocking";
import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { personalBests } from "@/models/drizzle/profiles.model";
import { ServiceResponse, type ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  CreatePersonalBestSchemaType,
  UpdateOwnProfileSchemaType,
  UpdatePersonalBestSchemaType,
} from "./profiles.validators";

export default class ProfilesService extends DrizzleService {
  async getByUsername(viewerUserId: number | null, username: string): Promise<ServiceApiResponse<unknown>> {
    try {
      const profile = await this.db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
          id: true,
          username: true,
          alias: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          homeDiveArea: true,
          experienceLevel: true,
          visibility: true,
        },
      });

      if (!profile) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Profile not found");
      }

      if (viewerUserId && viewerUserId !== profile.id) {
        const blocked = await isPlatformBlockedBetween(this.db, viewerUserId, profile.id);
        if (blocked) {
          return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Profile is not visible");
        }
      }

      const isOwner = viewerUserId === profile.id;
      const canViewProfile =
        profile.visibility === "PUBLIC" || (profile.visibility === "MEMBERS_ONLY" && viewerUserId !== null) || isOwner;

      if (!canViewProfile) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "Profile is not visible");
      }

      const pbVisibility = isOwner ? undefined : viewerUserId ? ["PUBLIC", "MEMBERS_ONLY"] : ["PUBLIC"];

      const pbs = await this.db.query.personalBests.findMany({
        where: and(eq(personalBests.userId, profile.id), isNull(personalBests.deletedAt)),
        orderBy: desc(personalBests.createdAt),
      });

      const visiblePbs =
        pbVisibility && pbVisibility.length > 1
          ? pbs.filter((pb) => pb.visibility === "PUBLIC" || pb.visibility === "MEMBERS_ONLY")
          : pbVisibility
            ? pbs.filter((pb) => pb.visibility === "PUBLIC")
            : pbs;

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Profile retrieved successfully", {
        profile,
        personalBests: visiblePbs,
      });
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async updateOwnProfile(userId: number, payload: UpdateOwnProfileSchemaType) {
    try {
      const updatedRows = await this.db.update(users).set(payload).where(eq(users.id, userId)).returning({
        id: users.id,
        username: users.username,
        alias: users.alias,
        name: users.name,
        image: users.image,
        bio: users.bio,
        location: users.location,
        homeDiveArea: users.homeDiveArea,
        experienceLevel: users.experienceLevel,
        visibility: users.visibility,
        buddyFinderVisibility: users.buddyFinderVisibility,
      });

      const updated = updatedRows[0];
      if (!updated) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Profile not found");
      }

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Profile updated successfully", updated);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async createPersonalBest(userId: number, payload: CreatePersonalBestSchemaType) {
    try {
      const createdRows = await this.db
        .insert(personalBests)
        .values({
          userId,
          discipline: payload.discipline,
          resultValue: payload.resultValue,
          resultUnit: payload.resultUnit,
          recordedAt: payload.recordedAt,
          visibility: payload.visibility,
        })
        .returning();

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Personal best created successfully", createdRows[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async updatePersonalBest(userId: number, personalBestId: number, payload: UpdatePersonalBestSchemaType) {
    try {
      const updatedRows = await this.db
        .update(personalBests)
        .set(payload)
        .where(and(eq(personalBests.id, personalBestId), eq(personalBests.userId, userId), isNull(personalBests.deletedAt)))
        .returning();

      const updated = updatedRows[0];
      if (!updated) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Personal best not found");
      }

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Personal best updated successfully", updated);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async deletePersonalBest(userId: number, personalBestId: number) {
    try {
      const deletedRows = await this.db
        .update(personalBests)
        .set({ deletedAt: new Date() })
        .where(and(eq(personalBests.id, personalBestId), eq(personalBests.userId, userId), isNull(personalBests.deletedAt)))
        .returning();

      if (!deletedRows[0]) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Personal best not found");
      }

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Personal best deleted successfully", deletedRows[0]);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
