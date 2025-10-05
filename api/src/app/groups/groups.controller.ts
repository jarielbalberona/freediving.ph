import { Request, Response } from "express";
import { db } from "@/databases/drizzle/connection";
import { groups, groupMembers, groupPosts, groupPostComments, groupPostLikes } from "@/models/drizzle/groups.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq, and, desc, asc, count, sql, like, or } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY", "CLOSED"]).optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY", "CLOSED"]).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const createGroupPostSchema = z.object({
  groupId: z.number().int().positive(),
  authorId: z.number().int().positive(),
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  postType: z.enum(["text", "image", "video", "link"]).optional(),
});

const createGroupCommentSchema = z.object({
  postId: z.number().int().positive(),
  userId: z.number().int().positive(),
  content: z.string().min(1),
});

const joinGroupSchema = z.object({
  groupId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.enum(["MEMBER", "MODERATOR", "ADMIN"]).optional(),
});

// Get all groups with pagination and filtering
export const getGroups = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];

    if (type) {
      whereConditions.push(eq(groups.type, type as any));
    }
    if (status) {
      whereConditions.push(eq(groups.status, status as any));
    }
    if (search) {
      whereConditions.push(
        or(
          like(groups.name, `%${search}%`),
          like(groups.description, `%${search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get groups with total count
    const [groupsList, totalCount] = await Promise.all([
      db
        .select()
        .from(groups)
        .where(whereClause)
        .orderBy(desc(groups.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(groups)
        .where(whereClause)
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        groups: groupsList,
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
    console.error("Error getting groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group by ID
export const getGroupById = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);

    if (isNaN(groupId)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json({
      success: true,
      data: group[0],
    });
  } catch (error) {
    console.error("Error getting group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new group
export const createGroup = async (req: Request, res: Response) => {
  try {
    const validatedData = createGroupSchema.parse(req.body);
    const userId = parseInt(req.body.userId); // Assuming userId comes from auth middleware

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const newGroup = await db
      .insert(groups)
      .values({
        ...validatedData,
        createdBy: userId,
        type: validatedData.type || "PUBLIC",
      })
      .returning();

    // Add creator as owner
    await db
      .insert(groupMembers)
      .values({
        groupId: newGroup[0].id,
        userId: userId,
        role: "OWNER",
      });

    res.status(201).json({
      success: true,
      data: newGroup[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update group
export const updateGroup = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId); // Assuming userId comes from auth middleware

    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid group ID or user ID" });
    }

    const validatedData = updateGroupSchema.parse(req.body);

    // Check if user is owner or admin
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (membership.length === 0 || !["OWNER", "ADMIN"].includes(membership[0].role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const updatedGroup = await db
      .update(groups)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId))
      .returning();

    if (updatedGroup.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json({
      success: true,
      data: updatedGroup[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Join group
export const joinGroup = async (req: Request, res: Response) => {
  try {
    const validatedData = joinGroupSchema.parse(req.body);

    // Check if group exists and is joinable
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, validatedData.groupId))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group[0].type === "CLOSED") {
      return res.status(403).json({ error: "Group is closed to new members" });
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(groupMembers)
      .where(and(
        eq(groupMembers.groupId, validatedData.groupId),
        eq(groupMembers.userId, validatedData.userId)
      ))
      .limit(1);

    if (existingMembership.length > 0) {
      return res.status(400).json({ error: "User is already a member" });
    }

    const newMembership = await db
      .insert(groupMembers)
      .values({
        groupId: validatedData.groupId,
        userId: validatedData.userId,
        role: validatedData.role || "MEMBER",
      })
      .returning();

    // Update member count
    await db
      .update(groups)
      .set({
        memberCount: sql`member_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, validatedData.groupId));

    res.status(201).json({
      success: true,
      data: newMembership[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave group
export const leaveGroup = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.body.userId); // Assuming userId comes from auth middleware

    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid group ID or user ID" });
    }

    // Check if user is a member
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    if (membership.length === 0) {
      return res.status(404).json({ error: "User is not a member of this group" });
    }

    // Check if user is the owner
    if (membership[0].role === "OWNER") {
      return res.status(400).json({ error: "Group owner cannot leave. Transfer ownership first." });
    }

    // Remove membership
    await db
      .update(groupMembers)
      .set({
        isActive: false,
        leftAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    // Update member count
    await db
      .update(groups)
      .set({
        memberCount: sql`member_count - 1`,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));

    res.json({
      success: true,
      message: "Successfully left the group",
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group members
export const getGroupMembers = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(groupId)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    const offset = (page - 1) * limit;

    const [members, totalCount] = await Promise.all([
      db
        .select({
          id: groupMembers.id,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
          isActive: groupMembers.isActive,
          user: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.isActive, true)))
        .orderBy(asc(groupMembers.joinedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.isActive, true)))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        members,
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
    console.error("Error getting group members:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group posts
export const getGroupPosts = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(groupId)) {
      return res.status(400).json({ error: "Invalid group ID" });
    }

    const offset = (page - 1) * limit;

    const [posts, totalCount] = await Promise.all([
      db
        .select({
          id: groupPosts.id,
          title: groupPosts.title,
          content: groupPosts.content,
          postType: groupPosts.postType,
          likeCount: groupPosts.likeCount,
          commentCount: groupPosts.commentCount,
          createdAt: groupPosts.createdAt,
          author: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(groupPosts)
        .innerJoin(users, eq(groupPosts.authorId, users.id))
        .where(eq(groupPosts.groupId, groupId))
        .orderBy(desc(groupPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(groupPosts)
        .where(eq(groupPosts.groupId, groupId))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        posts,
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
    console.error("Error getting group posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create group post
export const createGroupPost = async (req: Request, res: Response) => {
  try {
    const validatedData = createGroupPostSchema.parse(req.body);

    // Check if user is a member of the group
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(
        eq(groupMembers.groupId, validatedData.groupId),
        eq(groupMembers.userId, validatedData.authorId),
        eq(groupMembers.isActive, true)
      ))
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: "User is not a member of this group" });
    }

    const newPost = await db
      .insert(groupPosts)
      .values({
        ...validatedData,
        postType: validatedData.postType || "text",
      })
      .returning();

    // Update post count
    await db
      .update(groups)
      .set({
        postCount: sql`post_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, validatedData.groupId));

    res.status(201).json({
      success: true,
      data: newPost[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error creating group post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get user's groups
export const getUserGroups = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const offset = (page - 1) * limit;

    const [userGroups, totalCount] = await Promise.all([
      db
        .select({
          id: groups.id,
          name: groups.name,
          slug: groups.slug,
          description: groups.description,
          type: groups.type,
          memberCount: groups.memberCount,
          postCount: groups.postCount,
          createdAt: groups.createdAt,
          role: groupMembers.role,
          joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(and(eq(groupMembers.userId, userId), eq(groupMembers.isActive, true)))
        .orderBy(desc(groupMembers.joinedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(groupMembers)
        .where(and(eq(groupMembers.userId, userId), eq(groupMembers.isActive, true)))
    ]);

    const totalPages = Math.ceil(totalCount[0].count / limit);

    res.json({
      success: true,
      data: {
        groups: userGroups,
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
    console.error("Error getting user groups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
