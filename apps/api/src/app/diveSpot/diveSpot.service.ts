import { InferSelectModel, and, desc, eq, isNull, sql } from "drizzle-orm";

import { DiveSpotServerSchemaType } from "@/app/diveSpot/diveSpot.validators";

import DrizzleService from "@/databases/drizzle/service";
import { diveSpots } from "@/models/drizzle/diveSpots.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { buildOffsetPagination } from "@/utils/pagination";
import type { PaginationQuerySchemaType } from "@/validators/pagination.schema";

export type DiveSpotSchemaType = InferSelectModel<typeof diveSpots>;

export default class DiveSpotService extends DrizzleService {
	async createDiveSpot(data: DiveSpotServerSchemaType) {
		try {
			const createdData = await this.db
				.insert(diveSpots)
				.values({
					...data,
					state: "DRAFT",
					source: "COMMUNITY"
				})
				.returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid dive spot data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Dive Spot created successfully",
				createdData[0]
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async retrieveDiveSpot(id: number): Promise<ServiceApiResponse<DiveSpotSchemaType>> {
		try {
			const retrieveData = await this.db.query.diveSpots.findFirst({
				where: and(eq(diveSpots.id, id), eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt))
			});

			if (!retrieveData) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateDiveSpot(id: number, data: DiveSpotServerSchemaType) {
		try {
			const updatedData = await this.db.update(diveSpots).set(data).where(eq(diveSpots.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid dive spot id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spot updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllDiveSpot(query: PaginationQuerySchemaType) {
		try {
			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(diveSpots)
				.where(and(eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt)));
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const retrieveData = await this.db.query.diveSpots.findMany({
				where: and(eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt)),
				orderBy: desc(diveSpots.createdAt),
				limit: query.limit,
				offset: query.offset
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				retrieveData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async reviewDiveSpot(id: number, state: "PUBLISHED" | "FLAGGED" | "REMOVED", actorUserId?: number) {
		try {
			const updatedData = await this.db
				.update(diveSpots)
				.set({ state })
				.where(eq(diveSpots.id, id))
				.returning();

			if (!updatedData.length) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			await this.db.insert(auditLogs).values({
				actorUserId: actorUserId ?? null,
				action: "DIVE_SPOT_REVIEW_UPDATED",
				targetType: "DIVE_SITE",
				targetId: String(id),
				metadata: { state }
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Dive spot review updated", updatedData[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async testDiveSpot(id: number) {
		try {
			return ServiceResponse.createRejectResponse(
				status.HTTP_406_NOT_ACCEPTABLE,
				"Dive spot not accept"
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
