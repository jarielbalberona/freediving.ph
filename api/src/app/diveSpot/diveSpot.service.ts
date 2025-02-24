import { InferSelectModel, desc, eq } from "drizzle-orm";

import { DiveSpotServerSchemaType } from "@/app/diveSpot/diveSpot.validators";

import DrizzleService from "@/databases/drizzle/service";
import { diveSpot } from "@/models/drizzle/diveSpot.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export type DiveSpotSchemaType = InferSelectModel<typeof diveSpot>;

export default class DiveSpotService extends DrizzleService {
	async createDiveSpot(data: DiveSpotServerSchemaType) {
		try {
			const createdData = await this.db.insert(diveSpot).values(data).returning();

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
			const retrieveData = await this.db.query.diveSpot.findFirst({ where: eq(diveSpot.id, id) });

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
			const updatedData = await this.db.update(diveSpot).set(data).where(eq(diveSpot.id, id)).returning();

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

	async retrieveAllDiveSpot() {
		try {
			const retrieveData = await this.db.query.diveSpot.findMany({
				orderBy: desc(diveSpot.createdAt)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Dive spots retrieved successfully",
				retrieveData
			);
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
