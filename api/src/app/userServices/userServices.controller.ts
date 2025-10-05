import { Request, Response } from "express";
import { db } from "@/databases/drizzle/connection";
import { userServices, serviceBookings, serviceReviews, serviceAreas } from "@/models/drizzle/userServices.model";
import { serviceTypes } from "@/models/drizzle/serviceTypes.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq, and, desc, asc, count, sql, like, or, gte, lte } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const createUserServiceSchema = z.object({
  userId: z.number().int().positive(),
  serviceTypeId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  rate: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  rateType: z.enum(["per_hour", "per_day", "per_session"]).optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  maxTravelDistance: z.number().int().nonnegative().optional(),
  defaultTravelFee: z.number().nonnegative().optional(),
  maxDepth: z.number().int().nonnegative().optional(),
  equipmentProvided: z.boolean().optional(),
  equipmentDetails: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
  contactInfo: z.record(z.any()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimes: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const updateUserServiceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isAvailable: z.boolean().optional(),
  rate: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  rateType: z.enum(["per_hour", "per_day", "per_session"]).optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
  maxTravelDistance: z.number().int().nonnegative().optional(),
  defaultTravelFee: z.number().nonnegative().optional(),
  maxDepth: z.number().int().nonnegative().optional(),
  equipmentProvided: z.boolean().optional(),
  equipmentDetails: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
  contactInfo: z.record(z.any()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimes: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const createServiceBookingSchema = z.object({
  serviceId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  providerId: z.number().int().positive(),
  bookingDate: z.string().datetime(),
  duration: z.number().int().positive().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  rate: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
});

const createServiceReviewSchema = z.object({
  serviceId: z.number().int().positive(),
  bookingId: z.number().int().positive().optional(),
  reviewerId: z.number().int().positive(),
  revieweeId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  review: z.string().optional(),
  communicationRating: z.number().int().min(1).max(5).optional(),
  punctualityRating: z.number().int().min(1).max(5).optional(),
  skillRating: z.number().int().min(1).max(5).optional(),
});

// Get all user services with pagination and filtering
export const getUserServices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const serviceTypeId = req.query.serviceTypeId as string;
    const experienceLevel = req.query.experienceLevel as string;
    const isAvailable = req.query.isAvailable as string;
    const search = req.query.search as string;
    const minRate = req.query.minRate as string;
    const maxRate = req.query.maxRate as string;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (serviceTypeId) {
      whereConditions.push(eq(userServices.serviceTypeId, parseInt(serviceTypeId)));
    }
    if (experienceLevel) {
      whereConditions.push(eq(userServices.experienceLevel, experienceLevel as any));
    }
    if (isAvailable !== undefined) {
      whereConditions.push(eq(userServices.isAvailable, isAvailable === "true"));
    }
    if (search) {
      whereConditions.push(
        or(
          like(userServices.title, `%${search}%`),
          like(userServices.description, `%${search}%`),
          like(userServices.skills, `%${search}%`),
          like(userServices.specialties, `%${search}%`)
        )
      );
    }
    if (minRate) {
      whereConditions.push(gte(userServices.rate, parseFloat(minRate)));
    }
    if (maxRate) {
      whereConditions.push(lte(userServices.rate, parseFloat(maxRate)));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get services with total count
    const [servicesList, totalCount] = await Promise.all([
      db
        .select({
          id: userServices.id,
          title: userServices.title,
          description: userServices.description,
          rate: userServices.rate,
          currency: userServices.currency,
          rateType: userServices.rateType,
          experienceLevel: userServices.experienceLevel,
          yearsExperience: userServices.yearsExperience,
          skills: userServices.skills,
          certifications: userServices.certifications,
          specialties: userServices.specialties,
          maxTravelDistance: userServices.maxTravelDistance,
          equipmentProvided: userServices.equipmentProvided,
          portfolioUrl: userServices.portfolioUrl,
          isAvailable: userServices.isAvailable,
          createdAt: userServices.createdAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
            location: users.location,
          },
          serviceType: {
            id: serviceTypes.id,
            name: serviceTypes.name,
            emoji: serviceTypes.emoji,
          },
        })
        .from(userServices)
        .innerJoin(users, eq(userServices.userId, users.id))
        .innerJoin(serviceTypes, eq(userServices.serviceTypeId, serviceTypes.id))
        .where(whereClause)
        .orderBy(desc(userServices.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(userServices)
        .where(whereClause)
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        services: servicesList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting user services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user service by ID
export const getUserServiceById = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);

    if (isNaN(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    const service = await db
      .select({
        id: userServices.id,
        title: userServices.title,
        description: userServices.description,
        rate: userServices.rate,
        currency: userServices.currency,
        rateType: userServices.rateType,
        experienceLevel: userServices.experienceLevel,
        yearsExperience: userServices.yearsExperience,
        skills: userServices.skills,
        certifications: userServices.certifications,
        specialties: userServices.specialties,
        maxTravelDistance: userServices.maxTravelDistance,
        defaultTravelFee: userServices.defaultTravelFee,
        maxDepth: userServices.maxDepth,
        equipmentProvided: userServices.equipmentProvided,
        equipmentDetails: userServices.equipmentDetails,
        portfolioUrl: userServices.portfolioUrl,
        contactInfo: userServices.contactInfo,
        availableDays: userServices.availableDays,
        availableTimes: userServices.availableTimes,
        settings: userServices.settings,
        isAvailable: userServices.isAvailable,
        createdAt: userServices.createdAt,
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image,
          location: users.location,
          bio: users.bio,
        },
        serviceType: {
          id: serviceTypes.id,
          name: serviceTypes.name,
          description: serviceTypes.description,
          emoji: serviceTypes.emoji,
        },
      })
      .from(userServices)
      .innerJoin(users, eq(userServices.userId, users.id))
      .innerJoin(serviceTypes, eq(userServices.serviceTypeId, serviceTypes.id))
      .where(eq(userServices.id, serviceId))
      .limit(1);

    if (service.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json({
      success: true,
      data: service[0],
    });
  } catch (error) {
    console.error("Error getting user service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new user service
export const createUserService = async (req: Request, res: Response) => {
  try {
    const validatedData = createUserServiceSchema.parse(req.body);

    const newService = await db
      .insert(userServices)
      .values({
        ...validatedData,
        currency: validatedData.currency || "PHP",
        rateType: validatedData.rateType || "per_hour",
        experienceLevel: validatedData.experienceLevel || "INTERMEDIATE",
        equipmentProvided: validatedData.equipmentProvided || false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newService[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating user service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user service
export const updateUserService = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId); // Assuming userId comes from auth middleware

    if (isNaN(serviceId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid service ID or user ID" });
    }

    const validatedData = updateUserServiceSchema.parse(req.body);

    // Check if user owns this service
    const existingService = await db
      .select()
      .from(userServices)
      .where(and(eq(userServices.id, serviceId), eq(userServices.userId, userId)))
      .limit(1);

    if (existingService.length === 0) {
      return res.status(404).json({ error: "Service not found or access denied" });
    }

    const updatedService = await db
      .update(userServices)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(userServices.id, serviceId), eq(userServices.userId, userId)))
      .returning();

    res.json({
      success: true,
      data: updatedService[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating user service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete user service
export const deleteUserService = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId);

    if (isNaN(serviceId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid service ID or user ID" });
    }

    // Check if user owns this service
    const existingService = await db
      .select()
      .from(userServices)
      .where(and(eq(userServices.id, serviceId), eq(userServices.userId, userId)))
      .limit(1);

    if (existingService.length === 0) {
      return res.status(404).json({ error: "Service not found or access denied" });
    }

    await db
      .delete(userServices)
      .where(and(eq(userServices.id, serviceId), eq(userServices.userId, userId)));

    res.json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's services
export const getUserServicesByUserId = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const offset = (page - 1) * limit;

    const [userServicesList, totalCount] = await Promise.all([
      db
        .select({
          id: userServices.id,
          title: userServices.title,
          description: userServices.description,
          rate: userServices.rate,
          currency: userServices.currency,
          rateType: userServices.rateType,
          experienceLevel: userServices.experienceLevel,
          yearsExperience: userServices.yearsExperience,
          skills: userServices.skills,
          certifications: userServices.certifications,
          specialties: userServices.specialties,
          isAvailable: userServices.isAvailable,
          createdAt: userServices.createdAt,
          serviceType: {
            id: serviceTypes.id,
            name: serviceTypes.name,
            emoji: serviceTypes.emoji,
          },
        })
        .from(userServices)
        .innerJoin(serviceTypes, eq(userServices.serviceTypeId, serviceTypes.id))
        .where(eq(userServices.userId, userId))
        .orderBy(desc(userServices.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(userServices)
        .where(eq(userServices.userId, userId))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        services: userServicesList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting user services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create service booking
export const createServiceBooking = async (req: Request, res: Response) => {
  try {
    const validatedData = createServiceBookingSchema.parse(req.body);

    const newBooking = await db
      .insert(serviceBookings)
      .values({
        ...validatedData,
        bookingDate: new Date(validatedData.bookingDate),
        currency: validatedData.currency || "PHP",
        status: "PENDING",
        paymentStatus: "PENDING",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newBooking[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating service booking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get service bookings
export const getServiceBookings = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // 'client', 'provider'

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const offset = (page - 1) * limit;

    let bookingsList, totalCount;

    if (type === "client") {
      [bookingsList, totalCount] = await Promise.all([
        db
          .select({
            id: serviceBookings.id,
            bookingDate: serviceBookings.bookingDate,
            duration: serviceBookings.duration,
            location: serviceBookings.location,
            notes: serviceBookings.notes,
            rate: serviceBookings.rate,
            totalAmount: serviceBookings.totalAmount,
            currency: serviceBookings.currency,
            status: serviceBookings.status,
            paymentStatus: serviceBookings.paymentStatus,
            createdAt: serviceBookings.createdAt,
            service: {
              id: userServices.id,
              title: userServices.title,
              description: userServices.description,
            },
            provider: {
              id: users.id,
              name: users.name,
              username: users.username,
              image: users.image,
            },
          })
          .from(serviceBookings)
          .innerJoin(userServices, eq(serviceBookings.serviceId, userServices.id))
          .innerJoin(users, eq(serviceBookings.providerId, users.id))
          .where(eq(serviceBookings.clientId, userId))
          .orderBy(desc(serviceBookings.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(serviceBookings)
          .where(eq(serviceBookings.clientId, userId))
      ]);
    } else if (type === "provider") {
      [bookingsList, totalCount] = await Promise.all([
        db
          .select({
            id: serviceBookings.id,
            bookingDate: serviceBookings.bookingDate,
            duration: serviceBookings.duration,
            location: serviceBookings.location,
            notes: serviceBookings.notes,
            rate: serviceBookings.rate,
            totalAmount: serviceBookings.totalAmount,
            currency: serviceBookings.currency,
            status: serviceBookings.status,
            paymentStatus: serviceBookings.paymentStatus,
            createdAt: serviceBookings.createdAt,
            service: {
              id: userServices.id,
              title: userServices.title,
              description: userServices.description,
            },
            client: {
              id: users.id,
              name: users.name,
              username: users.username,
              image: users.image,
            },
          })
          .from(serviceBookings)
          .innerJoin(userServices, eq(serviceBookings.serviceId, userServices.id))
          .innerJoin(users, eq(serviceBookings.clientId, users.id))
          .where(eq(serviceBookings.providerId, userId))
          .orderBy(desc(serviceBookings.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(serviceBookings)
          .where(eq(serviceBookings.providerId, userId))
      ]);
    } else {
      // All bookings
      [bookingsList, totalCount] = await Promise.all([
        db
          .select()
          .from(serviceBookings)
          .where(or(eq(serviceBookings.clientId, userId), eq(serviceBookings.providerId, userId)))
          .orderBy(desc(serviceBookings.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(serviceBookings)
          .where(or(eq(serviceBookings.clientId, userId), eq(serviceBookings.providerId, userId)))
      ]);
    }

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        bookings: bookingsList,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting service bookings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create service review
export const createServiceReview = async (req: Request, res: Response) => {
  try {
    const validatedData = createServiceReviewSchema.parse(req.body);

    const newReview = await db
      .insert(serviceReviews)
      .values(validatedData)
      .returning();

    res.status(201).json({
      success: true,
      data: newReview[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating service review:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get service reviews
export const getServiceReviews = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(serviceId)) {
      return res.status(400).json({ error: "Invalid service ID" });
    }

    const offset = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      db
        .select({
          id: serviceReviews.id,
          rating: serviceReviews.rating,
          review: serviceReviews.review,
          communicationRating: serviceReviews.communicationRating,
          punctualityRating: serviceReviews.punctualityRating,
          skillRating: serviceReviews.skillRating,
          createdAt: serviceReviews.createdAt,
          reviewer: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(serviceReviews)
        .innerJoin(users, eq(serviceReviews.reviewerId, users.id))
        .where(eq(serviceReviews.serviceId, serviceId))
        .orderBy(desc(serviceReviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(serviceReviews)
        .where(eq(serviceReviews.serviceId, serviceId))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error getting service reviews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
