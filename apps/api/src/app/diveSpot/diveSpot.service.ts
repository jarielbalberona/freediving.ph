import {
	InferSelectModel,
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	gte,
	ilike,
	isNull,
	lte,
	or,
	sql
} from "drizzle-orm";

import {
	DiveSpotReviewCreateSchemaType,
	DiveSpotReviewListQuerySchemaType,
	DiveSpotServerSchemaType
} from "@/app/diveSpot/diveSpot.validators";

import DrizzleService from "@/databases/drizzle/service";
import { diveSpotComments, diveSpotRatings, diveSpots } from "@/models/drizzle/diveSpots.model";
import { users } from "@/models/drizzle/authentication.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { buildOffsetPagination } from "@/utils/pagination";
import type { PaginationQuerySchemaType } from "@/validators/pagination.schema";

export type DiveSpotSchemaType = InferSelectModel<typeof diveSpots>;
type DiveSpotsShape = "map" | "list";

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

	async retrieveAllDiveSpot(query: PaginationQuerySchemaType & {
		search?: string;
		location?: string;
		difficulty?: string;
		north?: number;
		south?: number;
		east?: number;
		west?: number;
		shape?: DiveSpotsShape;
		sort?: "newest" | "oldest" | "name";
	}) {
		try {
			const filters = [
				eq(diveSpots.state, "PUBLISHED"),
				isNull(diveSpots.deletedAt),
				query.search
					? or(
						ilike(diveSpots.name, `%${query.search}%`),
						ilike(diveSpots.locationName, `%${query.search}%`)
					)
					: undefined,
				query.location ? ilike(diveSpots.locationName, `%${query.location}%`) : undefined,
				query.difficulty ? eq(diveSpots.difficulty, query.difficulty as any) : undefined,
				typeof query.north === "number" ? lte(diveSpots.lat, query.north) : undefined,
				typeof query.south === "number" ? gte(diveSpots.lat, query.south) : undefined,
				typeof query.east === "number" ? lte(diveSpots.lng, query.east) : undefined,
				typeof query.west === "number" ? gte(diveSpots.lng, query.west) : undefined,
			].filter(Boolean) as any[];

			const whereClause = filters.length > 0 ? and(...filters) : undefined;

			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(diveSpots)
				.where(whereClause);
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const ratingsAgg = this.db
				.select({
					diveSpotId: diveSpotRatings.diveSpotId,
					avgRating: sql<number>`avg(${diveSpotRatings.rating})`,
					ratingCount: sql<number>`count(${diveSpotRatings.id})`
				})
				.from(diveSpotRatings)
				.groupBy(diveSpotRatings.diveSpotId)
				.as("ratings_agg");

			const commentsAgg = this.db
				.select({
					diveSpotId: diveSpotComments.diveSpotId,
					commentCount: sql<number>`count(${diveSpotComments.id})`
				})
				.from(diveSpotComments)
				.groupBy(diveSpotComments.diveSpotId)
				.as("comments_agg");

			const aggregateColumns = {
				avgRating: sql<number>`coalesce(round((${ratingsAgg.avgRating})::numeric, 2), 0)::double precision`,
				ratingCount: sql<number>`coalesce(${ratingsAgg.ratingCount}, 0)::integer`,
				commentCount: sql<number>`coalesce(${commentsAgg.commentCount}, 0)::integer`
			};

			const listColumns = {
				...getTableColumns(diveSpots),
				...aggregateColumns
			};
			const mapColumns = {
				id: diveSpots.id,
				name: diveSpots.name,
				lat: diveSpots.lat,
				lng: diveSpots.lng,
				locationName: diveSpots.locationName,
				depth: diveSpots.depth,
				difficulty: diveSpots.difficulty,
				imageUrl: diveSpots.imageUrl,
				...aggregateColumns
			};

			const orderByClause =
				query.sort === "name"
					? asc(diveSpots.name)
					: query.sort === "oldest"
						? asc(diveSpots.createdAt)
						: desc(diveSpots.createdAt);

			const columns = query.shape === "map" ? mapColumns : listColumns;
			const retrieveData = await this.db
				.select(columns)
				.from(diveSpots)
				.leftJoin(ratingsAgg, eq(ratingsAgg.diveSpotId, diveSpots.id))
				.leftJoin(commentsAgg, eq(commentsAgg.diveSpotId, diveSpots.id))
				.where(whereClause)
				.orderBy(orderByClause)
				.limit(query.limit)
				.offset(query.offset);

			const coarseData = retrieveData.map((row) => ({
				...row,
				lat: this.toCoarseCoordinate(row.lat ?? undefined) ?? null,
				lng: this.toCoarseCoordinate(row.lng ?? undefined) ?? null,
				avgRating: typeof row.avgRating === "number" ? row.avgRating : 0,
				ratingCount: Number(row.ratingCount ?? 0),
				commentCount: Number(row.commentCount ?? 0)
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

	private async ensurePublishedDiveSpot(id: number) {
		const existing = await this.db.query.diveSpots.findFirst({
			where: and(eq(diveSpots.id, id), eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt)),
			columns: {
				id: true
			}
		});
		return existing;
	}

	async retrieveDiveSpotReviewSummary(id: number) {
		try {
			const diveSpot = await this.ensurePublishedDiveSpot(id);
			if (!diveSpot) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			const [ratingsSummary] = await this.db
				.select({
					avgRating: sql<number>`coalesce(round(avg(${diveSpotRatings.rating})::numeric, 2), 0)::double precision`,
					ratingCount: sql<number>`count(${diveSpotRatings.id})::integer`
				})
				.from(diveSpotRatings)
				.where(eq(diveSpotRatings.diveSpotId, id));

			const [commentsSummary] = await this.db
				.select({
					commentCount: sql<number>`count(${diveSpotComments.id})::integer`
				})
				.from(diveSpotComments)
				.where(eq(diveSpotComments.diveSpotId, id));

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Dive spot review summary retrieved", {
				diveSpotId: id,
				avgRating: Number(ratingsSummary?.avgRating ?? 0),
				ratingCount: Number(ratingsSummary?.ratingCount ?? 0),
				commentCount: Number(commentsSummary?.commentCount ?? 0)
			});
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveDiveSpotReviews(id: number, query: DiveSpotReviewListQuerySchemaType) {
		try {
			const diveSpot = await this.ensurePublishedDiveSpot(id);
			if (!diveSpot) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(diveSpotRatings)
				.where(eq(diveSpotRatings.diveSpotId, id));
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const reviews = await this.db
				.select({
					id: diveSpotRatings.id,
					diveSpotId: diveSpotRatings.diveSpotId,
					userId: diveSpotRatings.userId,
					rating: diveSpotRatings.rating,
					review: diveSpotRatings.review,
					createdAt: diveSpotRatings.createdAt,
					updatedAt: diveSpotRatings.updatedAt,
					userName: users.username,
					userAlias: users.alias,
					userImage: users.image
				})
				.from(diveSpotRatings)
				.leftJoin(users, eq(users.id, diveSpotRatings.userId))
				.where(eq(diveSpotRatings.diveSpotId, id))
				.orderBy(query.sort === "oldest" ? asc(diveSpotRatings.createdAt) : desc(diveSpotRatings.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spot reviews retrieved",
				reviews.map((review) => ({
					...review,
					comment: review.review ?? null
				})),
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async createOrUpdateDiveSpotReview(id: number, userId: number, payload: DiveSpotReviewCreateSchemaType) {
		try {
			const diveSpot = await this.ensurePublishedDiveSpot(id);
			if (!diveSpot) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
			}

			const [savedReview] = await this.db.transaction(async (tx) => {
				const existing = await tx
					.select({ id: diveSpotRatings.id })
					.from(diveSpotRatings)
					.where(and(eq(diveSpotRatings.diveSpotId, id), eq(diveSpotRatings.userId, userId)))
					.limit(1);

				if (existing[0]) {
					const updated = await tx
						.update(diveSpotRatings)
						.set({
							rating: payload.rating,
							review: payload.comment ?? null
						})
						.where(eq(diveSpotRatings.id, existing[0].id))
						.returning();

					if (payload.comment?.trim()) {
						await tx.insert(diveSpotComments).values({
							diveSpotId: id,
							userId,
							content: payload.comment.trim()
						});
					}

					return updated;
				}

				const created = await tx
					.insert(diveSpotRatings)
					.values({
						diveSpotId: id,
						userId,
						rating: payload.rating,
						review: payload.comment ?? null
					})
					.returning();

				if (payload.comment?.trim()) {
					await tx.insert(diveSpotComments).values({
						diveSpotId: id,
						userId,
						content: payload.comment.trim()
					});
				}

				return created;
			});

			const [withUser] = await this.db
				.select({
					id: diveSpotRatings.id,
					diveSpotId: diveSpotRatings.diveSpotId,
					userId: diveSpotRatings.userId,
					rating: diveSpotRatings.rating,
					review: diveSpotRatings.review,
					createdAt: diveSpotRatings.createdAt,
					updatedAt: diveSpotRatings.updatedAt,
					userName: users.username,
					userAlias: users.alias,
					userImage: users.image
				})
				.from(diveSpotRatings)
				.leftJoin(users, eq(users.id, diveSpotRatings.userId))
				.where(eq(diveSpotRatings.id, savedReview.id))
				.limit(1);

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Dive spot review saved", {
				...withUser,
				comment: withUser?.review ?? null
			});
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
