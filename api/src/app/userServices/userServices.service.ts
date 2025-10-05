import { InferSelectModel, desc, eq, count, sql } from "drizzle-orm";

import { UserServicesServerSchemaType, UserServicesUpdateSchemaType, ServiceBookingSchemaType, ServiceReviewSchemaType } from "@/app/userServices/userServices.validators";
import { users } from "@/models/drizzle/authentication.model";
import DrizzleService from "@/databases/drizzle/service";
import { userServices, serviceBookings, serviceReviews } from "@/models/drizzle/userServices.model";
import { serviceTypes } from "@/models/drizzle/serviceTypes.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type UserServicesSchemaType = InferSelectModel<typeof userServices>;

export default class UserServicesService extends DrizzleService {
	async create(data: UserServicesServerSchemaType) {
		try {
			const createdData = await this.db.insert(userServices).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid service data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Service created successfully",
				createdData[0]
			);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	async retrieve(id: number): Promise<ServiceApiResponse<UserServicesSchemaType>> {
		try {
			const retrieveData = await this.db.query.userServices.findFirst({
				where: eq(userServices.id, id),
				with: {
					user: {
						columns: {
							id: true,
							username: true,
							email: true,
							alias: true,
						},
					},
					serviceType: {
						columns: {
							id: true,
							name: true,
							description: true,
						},
					},
					bookings: {
						with: {
							client: {
								columns: {
									id: true,
									username: true,
									alias: true,
								},
							},
						},
					},
					reviews: {
						with: {
							reviewer: {
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
					"Service not found"
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Service retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(id: number, data: UserServicesUpdateSchemaType) {
		try {
			const updatedData = await this.db.update(userServices).set(data).where(eq(userServices.id, id)).returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid service id",
					updatedData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Service updated successfully",
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
					service: userServices,
					user: {
						id: users.id,
						username: users.username,
						email: users.email,
						alias: users.alias,
					},
					serviceType: {
						id: serviceTypes.id,
						name: serviceTypes.name,
						description: serviceTypes.description,
					},
					bookingCount: count(serviceBookings.id),
					reviewCount: count(serviceReviews.id),
					averageRating: sql<number>`COALESCE(AVG(${serviceReviews.rating}), 0)`,
				})
				.from(userServices)
				.leftJoin(users, eq(userServices.userId, users.id))
				.leftJoin(serviceTypes, eq(userServices.serviceTypeId, serviceTypes.id))
				.leftJoin(serviceBookings, eq(userServices.id, serviceBookings.serviceId))
				.leftJoin(serviceReviews, eq(userServices.id, serviceReviews.serviceId))
				.groupBy(userServices.id, users.id, serviceTypes.id)
				.orderBy(desc(userServices.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Services retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getUserServices(userId: number) {
		try {
			const retrieveData = await this.db
				.select({
					service: userServices,
					serviceType: {
						id: serviceTypes.id,
						name: serviceTypes.name,
						description: serviceTypes.description,
					},
					bookingCount: count(serviceBookings.id),
					reviewCount: count(serviceReviews.id),
					averageRating: sql<number>`COALESCE(AVG(${serviceReviews.rating}), 0)`,
				})
				.from(userServices)
				.leftJoin(serviceTypes, eq(userServices.serviceTypeId, serviceTypes.id))
				.leftJoin(serviceBookings, eq(userServices.id, serviceBookings.serviceId))
				.leftJoin(serviceReviews, eq(userServices.id, serviceReviews.serviceId))
				.where(eq(userServices.userId, userId))
				.groupBy(userServices.id, serviceTypes.id)
				.orderBy(desc(userServices.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User services retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Service Bookings methods
	async createBooking(data: ServiceBookingSchemaType) {
		try {
			const createdData = await this.db.insert(serviceBookings).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid booking data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Booking created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getServiceBookings(serviceId: number) {
		try {
			const retrieveData = await this.db
				.select({
					booking: serviceBookings,
					client: {
						id: users.id,
						username: users.username,
						alias: users.alias,
						email: users.email,
					},
				})
				.from(serviceBookings)
				.leftJoin(users, eq(serviceBookings.clientId, users.id))
				.where(eq(serviceBookings.serviceId, serviceId))
				.orderBy(desc(serviceBookings.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Service bookings retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getUserBookings(userId: number) {
		try {
			const retrieveData = await this.db
				.select({
					booking: serviceBookings,
					service: {
						id: userServices.id,
						title: userServices.title,
						description: userServices.description,
						rate: userServices.rate,
						currency: userServices.currency,
					},
					provider: {
						id: users.id,
						username: users.username,
						alias: users.alias,
					},
				})
				.from(serviceBookings)
				.leftJoin(userServices, eq(serviceBookings.serviceId, userServices.id))
				.leftJoin(users, eq(userServices.userId, users.id))
				.where(eq(serviceBookings.clientId, userId))
				.orderBy(desc(serviceBookings.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User bookings retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	// Service Reviews methods
	async createReview(data: ServiceReviewSchemaType) {
		try {
			const createdData = await this.db.insert(serviceReviews).values(data).returning();

			if (!createdData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_406_NOT_ACCEPTABLE,
					"Invalid review data",
					createdData[0]
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Review created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getServiceReviews(serviceId: number) {
		try {
			const retrieveData = await this.db
				.select({
					review: serviceReviews,
					reviewer: {
						id: users.id,
						username: users.username,
						alias: users.alias,
					},
				})
				.from(serviceReviews)
				.leftJoin(users, eq(serviceReviews.reviewerId, users.id))
				.where(eq(serviceReviews.serviceId, serviceId))
				.orderBy(desc(serviceReviews.createdAt));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Service reviews retrieved successfully",
				retrieveData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateBookingStatus(bookingId: number, status: string) {
		try {
			const updatedData = await this.db
				.update(serviceBookings)
				.set({ status })
				.where(eq(serviceBookings.id, bookingId))
				.returning();

			if (!updatedData.length) {
				return ServiceResponse.createResponse(
					status.HTTP_404_NOT_FOUND,
					"Booking not found",
					null
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Booking status updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
