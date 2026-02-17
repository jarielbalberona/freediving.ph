import { InferSelectModel, and, desc, eq, count, isNull, sql } from "drizzle-orm";
import { hasMinimumGlobalRole, type GlobalRole } from "@freediving.ph/config";

import { EventsServerSchemaType, EventsUpdateSchemaType, EventAttendeeSchemaType } from "./events.validators";
import { getPlatformBlockedUserIds, isPlatformBlockedBetween } from "@/core/blocking";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { events, eventAttendees } from "@/models/drizzle/events.model";
import { diveSpots } from "@/models/drizzle/diveSpots.model";
import { auditLogs } from "@/models/drizzle/moderation.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { buildOffsetPagination } from "@/utils/pagination";
import type { PaginationQuerySchemaType } from "@/validators/pagination.schema";
import type { EventsListQuerySchemaType } from "./events.validators";

export type EventsSchemaType = InferSelectModel<typeof events>;

export default class EventsService extends DrizzleService {
	private isModeratorRole(role: GlobalRole | null | undefined) {
		if (!role) return false;
		return hasMinimumGlobalRole(role, "moderator");
	}

	async create(data: EventsServerSchemaType, actorUserId: number, actorRole: GlobalRole) {
		try {
			const isModerator = this.isModeratorRole(actorRole);
			if (data.organizerType === "USER" && data.organizerId !== actorUserId && !isModerator) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_403_FORBIDDEN,
					"Cannot create event for another user"
				);
			}

			// Convert price to string for decimal field
			const insertData = {
				...data,
				price: data.price?.toString(),
				earlyBirdPrice: data.earlyBirdPrice?.toString(),
			};
			const createdData = await this.db.insert(events).values(insertData).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid event data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Event created successfully",
				createdData[0]
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async retrieve(id: number, viewerUserId: number | null = null): Promise<ServiceApiResponse<EventsSchemaType>> {
		try {
			const retrieveData = await this.db.query.events.findFirst({
				where: and(eq(events.id, id), isNull(events.deletedAt)),
				with: {
					group: {
						columns: {
							id: true,
							name: true,
							description: true,
						},
					},
					attendees: {
						with: {
							user: {
								columns: {
									id: true,
									username: true,
									alias: true,
								},
							},
						},
					},
				},
			});

			if (!retrieveData) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Event not found"
				);
			}

			if (viewerUserId && retrieveData.organizerType === "USER") {
				const blocked = await isPlatformBlockedBetween(this.db, viewerUserId, retrieveData.organizerId);
				if (blocked) {
					return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Event not found");
				}
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Event retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: EventsUpdateSchemaType, actorUserId: number, actorRole: GlobalRole) {
		try {
			const existingEvent = await this.db.query.events.findFirst({
				where: and(eq(events.id, id), isNull(events.deletedAt))
			});
			if (!existingEvent) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Event not found");
			}

			const isModerator = this.isModeratorRole(actorRole);
			const isOrganizer = existingEvent.organizerType === "USER" && existingEvent.organizerId === actorUserId;
			if (!isModerator && !isOrganizer) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_403_FORBIDDEN,
					"Only organizer or moderator can update this event"
				);
			}

			if (!isModerator && existingEvent.startDate && existingEvent.startDate.getTime() <= Date.now()) {
				const allowedAfterStart = data.status === "CANCELLED" && Object.keys(data).length === 1;
				if (!allowedAfterStart) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_403_FORBIDDEN,
						"After event start, only cancellation is allowed"
					);
				}
			}

			// Convert price to string for decimal field
			const updateData = {
				...data,
				price: data.price?.toString(),
				earlyBirdPrice: data.earlyBirdPrice?.toString(),
			};
			const updatedData = await this.db.update(events).set(updateData).where(eq(events.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid event id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Event updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async moderateRemove(id: number, moderatorUserId: number) {
		try {
			const updatedData = await this.db
				.update(events)
				.set({
					status: "REMOVED",
					settings: JSON.stringify({
						moderated: true,
						moderatedByUserId: moderatorUserId,
						moderatedAt: new Date().toISOString()
					})
				})
				.where(eq(events.id, id))
				.returning();

			if (!updatedData.length) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Event not found");
			}

			await this.db.insert(auditLogs).values({
				actorUserId: moderatorUserId,
				action: "EVENT_MODERATED_REMOVE",
				targetType: "EVENT",
				targetId: String(id),
				metadata: {
					previousStatus: updatedData[0]?.status ?? null
				}
			});

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Event removed by moderator", updatedData[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAll(query: EventsListQuerySchemaType, viewerUserId: number | null = null) {
		try {
			let derivedLocationTerms: string[] = [];
			if (query.diveSpotId) {
				const diveSpot = await this.db.query.diveSpots.findFirst({
					where: and(eq(diveSpots.id, query.diveSpotId), eq(diveSpots.state, "PUBLISHED"), isNull(diveSpots.deletedAt)),
					columns: {
						name: true,
						locationName: true
					}
				});
				if (!diveSpot) {
					return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Dive spot not found");
				}
				derivedLocationTerms = [diveSpot.name, diveSpot.locationName].filter((value): value is string => Boolean(value));
			}

			const whereConditions = and(
				isNull(events.deletedAt),
				query.status ? eq(events.status, query.status) : eq(events.status, "PUBLISHED"),
				query.search ? sql`${events.title} ILIKE ${`%${query.search}%`}` : undefined,
				query.location ? sql`${events.location} ILIKE ${`%${query.location}%`}` : undefined,
				derivedLocationTerms.length > 0
					? sql`(${events.location} ILIKE ${`%${derivedLocationTerms[0]}%`} OR ${events.location} ILIKE ${`%${derivedLocationTerms[1] ?? derivedLocationTerms[0]}%`})`
					: undefined
			);

			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(events)
				.where(whereConditions);
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const retrieveData = await this.db
				.select({
					event: events,
					organizer: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias,
					},
					attendeeCount: count(eventAttendees.id),
				})
				.from(events)
				.leftJoin(users, eq(events.organizerId, users.id))
				.leftJoin(eventAttendees, eq(events.id, eventAttendees.eventId))
				.where(whereConditions)
				.groupBy(events.id, users.id)
				.orderBy(desc(events.startDate))
				.limit(query.limit)
				.offset(query.offset);

			const blockedUserIds = viewerUserId ? await getPlatformBlockedUserIds(this.db, viewerUserId) : null;
			const filteredData = blockedUserIds
				? retrieveData.filter((row) => row.event.organizerType !== "USER" || !blockedUserIds.has(row.event.organizerId))
				: retrieveData;

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Events retrieved successfully",
				filteredData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Event Attendees methods
	async addAttendee(eventId: number, actorUserId: number, data: EventAttendeeSchemaType) {
		try {
			const event = await this.db.query.events.findFirst({
				where: and(eq(events.id, eventId), isNull(events.deletedAt))
			});
			if (!event) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Event not found");
			}

			// Check if user is already attending
			const existingAttendee = await this.db
				.select()
				.from(eventAttendees)
				.where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, actorUserId)))
				.limit(1);

			if (existingAttendee.length > 0) {
				return ServiceResponse.createResponse(
					status.HTTP_409_CONFLICT,
					"User is already attending this event",
					existingAttendee[0]
				);
			}

			const createdData = await this.db
				.insert(eventAttendees)
				.values({
					eventId,
					userId: actorUserId,
					status: data.status,
					emergencyContact: data.emergencyContact,
					notes: data.notes
				})
				.returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid attendee data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Attendee added successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeAttendee(eventId: number, userId: number, actorUserId: number, actorRole: GlobalRole) {
		try {
			if (actorUserId !== userId) {
				const event = await this.db.query.events.findFirst({
					where: and(eq(events.id, eventId), isNull(events.deletedAt))
				});
				if (!event) {
					return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Event not found");
				}
				if (event.organizerType === "USER") {
					const blocked = await isPlatformBlockedBetween(this.db, actorUserId, event.organizerId);
					if (blocked) {
						return ServiceResponse.createRejectResponse(
							status.HTTP_403_FORBIDDEN,
							"Cannot join event due to block relationship"
						);
					}
				}

				const isOrganizer = event.organizerType === "USER" && event.organizerId === actorUserId;
				if (!isOrganizer && !this.isModeratorRole(actorRole)) {
					return ServiceResponse.createRejectResponse(
						status.HTTP_403_FORBIDDEN,
						"Only attendee, organizer, or moderator can remove attendance"
					);
				}
			}

			const deletedData = await this.db
				.delete(eventAttendees)
				.where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)))
				.returning();

			if (!deletedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Attendee not found",
					null
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Attendee removed successfully",
				deletedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getAttendees(eventId: number, query: PaginationQuerySchemaType, viewerUserId: number | null = null) {
		try {
			const totalRows = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(eventAttendees)
				.where(eq(eventAttendees.eventId, eventId));
			const totalItems = Number(totalRows[0]?.count ?? 0);

			const retrieveData = await this.db
				.select({
					attendee: eventAttendees,
					user: {
						id: users.id,
						username: users.username,
						alias: users.alias,
						email: users.email,
					},
				})
				.from(eventAttendees)
				.leftJoin(users, eq(eventAttendees.userId, users.id))
				.where(eq(eventAttendees.eventId, eventId))
				.orderBy(desc(eventAttendees.createdAt))
				.limit(query.limit)
				.offset(query.offset);

			const blockedUserIds = viewerUserId ? await getPlatformBlockedUserIds(this.db, viewerUserId) : null;
			const filteredData = blockedUserIds
				? retrieveData.filter((row) => !blockedUserIds.has(row.attendee.userId))
				: retrieveData;

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Event attendees retrieved successfully",
				filteredData,
				buildOffsetPagination(totalItems, query.limit, query.offset)
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
