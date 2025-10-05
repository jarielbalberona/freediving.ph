import { Request, Response } from "express";
import { db } from "@/databases/drizzle/connection";
import { events, eventAttendees, eventWaitlist, eventComments, eventLikes } from "@/models/drizzle/events.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq, and, desc, asc, count, sql, like, or, gte, lte } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.enum(["DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL", "CLEANUP", "WORKSHOP", "OTHER"]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP_ONLY"]).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timezone: z.string().max(50).optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maxAttendees: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  registrationDeadline: z.string().datetime().optional(),
  earlyBirdPrice: z.number().nonnegative().optional(),
  earlyBirdDeadline: z.string().datetime().optional(),
  requirements: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
  socialLinks: z.string().optional(),
  organizerType: z.enum(["user", "group"]),
  organizerId: z.number().int().positive(),
  groupId: z.number().int().positive().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: z.enum(["DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL", "CLEANUP", "WORKSHOP", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED", "ARCHIVED"]).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP_ONLY"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maxAttendees: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
  registrationDeadline: z.string().datetime().optional(),
  earlyBirdPrice: z.number().nonnegative().optional(),
  earlyBirdDeadline: z.string().datetime().optional(),
  requirements: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
  socialLinks: z.string().optional(),
});

const registerForEventSchema = z.object({
  eventId: z.number().int().positive(),
  userId: z.number().int().positive(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
});

const createEventCommentSchema = z.object({
  eventId: z.number().int().positive(),
  userId: z.number().int().positive(),
  content: z.string().min(1),
});

// Get all events with pagination and filtering
export const getEvents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const visibility = req.query.visibility as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (type) {
      whereConditions.push(eq(events.type, type as any));
    }
    if (status) {
      whereConditions.push(eq(events.status, status as any));
    }
    if (visibility) {
      whereConditions.push(eq(events.visibility, visibility as any));
    }
    if (search) {
      whereConditions.push(
        or(
          like(events.title, `%${search}%`),
          like(events.description, `%${search}%`),
          like(events.locationName, `%${search}%`)
        )
      );
    }
    if (startDate) {
      whereConditions.push(gte(events.startDate, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(events.endDate, new Date(endDate)));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get events with total count
    const [eventsList, totalCount] = await Promise.all([
      db
        .select()
        .from(events)
        .where(whereClause)
        .orderBy(desc(events.startDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(events)
        .where(whereClause)
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        events: eventsList,
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
    console.error("Error getting events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get event by ID
export const getEventById = async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({
      success: true,
      data: event[0],
    });
  } catch (error) {
    console.error("Error getting event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const validatedData = createEventSchema.parse(req.body);

    const newEvent = await db
      .insert(events)
      .values({
        ...validatedData,
        type: validatedData.type || "DIVE_SESSION",
        visibility: validatedData.visibility || "PUBLIC",
        timezone: validatedData.timezone || "Asia/Manila",
        currency: validatedData.currency || "PHP",
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        registrationDeadline: validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : undefined,
        earlyBirdDeadline: validatedData.earlyBirdDeadline ? new Date(validatedData.earlyBirdDeadline) : undefined,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newEvent[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId); // Assuming userId comes from auth middleware

    if (isNaN(eventId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }

    const validatedData = updateEventSchema.parse(req.body);

    // Check if user is the organizer
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event[0].organizerType === "user" && event[0].organizerId !== userId) {
      return res.status(403).json({ error: "Only the event organizer can update this event" });
    }

    const updatedEvent = await db
      .update(events)
      .set({
        ...validatedData,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        registrationDeadline: validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : undefined,
        earlyBirdDeadline: validatedData.earlyBirdDeadline ? new Date(validatedData.earlyBirdDeadline) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId))
      .returning();

    res.json({
      success: true,
      data: updatedEvent[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Register for event
export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const validatedData = registerForEventSchema.parse(req.body);

    // Check if event exists and is published
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, validatedData.eventId))
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event[0].status !== "PUBLISHED") {
      return res.status(400).json({ error: "Event is not available for registration" });
    }

    // Check if registration deadline has passed
    if (event[0].registrationDeadline && new Date() > event[0].registrationDeadline) {
      return res.status(400).json({ error: "Registration deadline has passed" });
    }

    // Check if user is already registered
    const existingRegistration = await db
      .select()
      .from(eventAttendees)
      .where(and(
        eq(eventAttendees.eventId, validatedData.eventId),
        eq(eventAttendees.userId, validatedData.userId)
      ))
      .limit(1);

    if (existingRegistration.length > 0) {
      return res.status(400).json({ error: "User is already registered for this event" });
    }

    // Check if event is full
    if (event[0].maxAttendees && event[0].currentAttendees >= event[0].maxAttendees) {
      // Add to waitlist
      const waitlistPosition = await db
        .select({ count: count() })
        .from(eventWaitlist)
        .where(eq(eventWaitlist.eventId, validatedData.eventId));

      await db
        .insert(eventWaitlist)
        .values({
          eventId: validatedData.eventId,
          userId: validatedData.userId,
          position: waitlistPosition[0].count + 1,
        });

      return res.status(201).json({
        success: true,
        message: "Added to waitlist",
        data: { position: waitlistPosition[0].count + 1 },
      });
    }

    // Register for event
    const newRegistration = await db
      .insert(eventAttendees)
      .values({
        eventId: validatedData.eventId,
        userId: validatedData.userId,
        emergencyContact: validatedData.emergencyContact,
        notes: validatedData.notes,
        amountPaid: event[0].price || 0,
        paymentStatus: event[0].price ? "PENDING" : "PAID",
      })
      .returning();

    // Update attendee count
    await db
      .update(events)
      .set({
        currentAttendees: sql`current_attendees + 1`,
        updatedAt: new Date(),
      })
      .where(eq(events.id, validatedData.eventId));

    res.status(201).json({
      success: true,
      data: newRegistration[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Cancel event registration
export const cancelEventRegistration = async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId);

    if (isNaN(eventId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid event ID or user ID" });
    }

    // Remove from attendees
    const cancelledRegistration = await db
      .update(eventAttendees)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(and(
        eq(eventAttendees.eventId, eventId),
        eq(eventAttendees.userId, userId)
      ))
      .returning();

    if (cancelledRegistration.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Update attendee count
    await db
      .update(events)
      .set({
        currentAttendees: sql`current_attendees - 1`,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    // Check if there's someone on the waitlist to move up
    const nextWaitlistUser = await db
      .select()
      .from(eventWaitlist)
      .where(eq(eventWaitlist.eventId, eventId))
      .orderBy(asc(eventWaitlist.position))
      .limit(1);

    if (nextWaitlistUser.length > 0) {
      // Move from waitlist to attendees
      await db
        .insert(eventAttendees)
        .values({
          eventId: eventId,
          userId: nextWaitlistUser[0].userId,
          status: "REGISTERED",
        });

      // Remove from waitlist
      await db
        .delete(eventWaitlist)
        .where(and(
          eq(eventWaitlist.eventId, eventId),
          eq(eventWaitlist.userId, nextWaitlistUser[0].userId)
        ));

      // Update waitlist positions
      await db
        .update(eventWaitlist)
        .set({
          position: sql`position - 1`,
        })
        .where(eq(eventWaitlist.eventId, eventId));
    }

    res.json({
      success: true,
      message: "Registration cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling event registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get event attendees
export const getEventAttendees = async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(eventId)) {
      return res.status(400).json({ error: "Invalid event ID" });
    }

    const offset = (page - 1) * limit;

    const [attendees, totalCount] = await Promise.all([
      db
        .select({
          id: eventAttendees.id,
          status: eventAttendees.status,
          paymentStatus: eventAttendees.paymentStatus,
          emergencyContact: eventAttendees.emergencyContact,
          notes: eventAttendees.notes,
          registeredAt: eventAttendees.createdAt,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(eventAttendees)
        .innerJoin(users, eq(eventAttendees.userId, users.id))
        .where(eq(eventAttendees.eventId, eventId))
        .orderBy(asc(eventAttendees.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(eventAttendees)
        .where(eq(eventAttendees.eventId, eventId))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        attendees,
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
    console.error("Error getting event attendees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's events
export const getUserEvents = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // 'created', 'attending', 'past'

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const offset = (page - 1) * limit;

    let eventsList, totalCount;

    if (type === "created") {
      // Events created by user
      [eventsList, totalCount] = await Promise.all([
        db
          .select()
          .from(events)
          .where(and(eq(events.organizerType, "user"), eq(events.organizerId, userId)))
          .orderBy(desc(events.startDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(events)
          .where(and(eq(events.organizerType, "user"), eq(events.organizerId, userId)))
      ]);
    } else if (type === "attending") {
      // Events user is attending
      [eventsList, totalCount] = await Promise.all([
        db
          .select({
            id: events.id,
            title: events.title,
            slug: events.slug,
            description: events.description,
            type: events.type,
            startDate: events.startDate,
            endDate: events.endDate,
            locationName: events.locationName,
            price: events.price,
            status: eventAttendees.status,
            registeredAt: eventAttendees.createdAt,
          })
          .from(eventAttendees)
          .innerJoin(events, eq(eventAttendees.eventId, events.id))
          .where(and(
            eq(eventAttendees.userId, userId),
            eq(eventAttendees.status, "REGISTERED")
          ))
          .orderBy(desc(events.startDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(eventAttendees)
          .where(and(
            eq(eventAttendees.userId, userId),
            eq(eventAttendees.status, "REGISTERED")
          ))
      ]);
    } else {
      // All events (default)
      [eventsList, totalCount] = await Promise.all([
        db
          .select()
          .from(events)
          .orderBy(desc(events.startDate))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(events)
      ]);
    }

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        events: eventsList,
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
    console.error("Error getting user events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
