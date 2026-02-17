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
	private toCoarseCoordinate(value: number | undefined) {
		if (typeof value !== "number" || Number.isNaN(value)) return undefined;
		return Math.round(value * 10) / 10;
	}

	async createDiveSpot(data: DiveSpotServerSchemaType) {
		try {
			const createdData = await this.db
				.insert(diveSpots)
				.values({
					...data,
					lat: this.toCoarseCoordinate(data.lat),
					lng: this.toCoarseCoordinate(data.lng),
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

			const coarseData = {
				...retrieveData,
				lat: this.toCoarseCoordinate(retrieveData.lat ?? undefined) ?? null,
				lng: this.toCoarseCoordinate(retrieveData.lng ?? undefined) ?? null
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				coarseData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateDiveSpot(id: number, data: DiveSpotServerSchemaType) {
		try {
			const updatedData = await this.db
				.update(diveSpots)
				.set({
					...data,
					lat: this.toCoarseCoordinate(data.lat),
					lng: this.toCoarseCoordinate(data.lng)
				})
				.where(eq(diveSpots.id, id))
				.returning();
			const updatedCoarse = updatedData.map((row) => ({
				...row,
				lat: this.toCoarseCoordinate(row.lat ?? undefined) ?? null,
				lng: this.toCoarseCoordinate(row.lng ?? undefined) ?? null
			}));

			if (!updatedCoarse.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid dive spot id",
					updatedCoarse[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spot updated successfully",
				updatedCoarse[0]
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
			const coarseData = retrieveData.map((row) => ({
				...row,
				lat: this.toCoarseCoordinate(row.lat ?? undefined) ?? null,
				lng: this.toCoarseCoordinate(row.lng ?? undefined) ?? null
			}));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				coarseData,
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
