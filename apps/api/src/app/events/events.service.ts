import { InferSelectModel, and, desc, eq, count, sql } from "drizzle-orm";

import { EventsServerSchemaType, EventsUpdateSchemaType, EventAttendeeSchemaType } from "./events.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { events, eventAttendees } from "@/models/drizzle/events.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type EventsSchemaType = InferSelectModel<typeof events>;

export default class EventsService extends DrizzleService {
	async create(data: EventsServerSchemaType) {
		try {
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

	async retrieve(id: number): Promise<ServiceApiResponse<EventsSchemaType>> {
		try {
			const retrieveData = await this.db.query.events.findFirst({
				where: eq(events.id, id),
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

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Event retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: EventsUpdateSchemaType) {
		try {
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

	async retrieveAll() {
		try {
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
				.groupBy(events.id, users.id)
				.orderBy(desc(events.startDate));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Events retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Event Attendees methods
	async addAttendee(data: EventAttendeeSchemaType) {
		try {
			// Check if user is already attending
			const existingAttendee = await this.db
				.select()
				.from(eventAttendees)
				.where(and(eq(eventAttendees.eventId, data.eventId), eq(eventAttendees.userId, data.userId)))
				.limit(1);

			if (existingAttendee.length > 0) {
				return ServiceResponse.createResponse(
					status.HTTP_409_CONFLICT,
					"User is already attending this event",
					existingAttendee[0]
				);
			}

			const createdData = await this.db.insert(eventAttendees).values(data).returning();

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

	async removeAttendee(eventId: number, userId: number) {
		try {
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

	async getAttendees(eventId: number) {
		try {
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
				.orderBy(desc(eventAttendees.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Event attendees retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
