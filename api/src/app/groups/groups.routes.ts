import { Router } from "express";
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  getGroupPosts,
  createGroupPost,
  getUserGroups,
} from "./groups.controller";

const router = Router();

// Group routes
router.get("/", getGroups);
router.get("/:id", getGroupById);
router.post("/", createGroup);
router.put("/:id", updateGroup);

// Group membership routes
router.post("/join", joinGroup);
router.post("/:id/leave", leaveGroup);
router.get("/:id/members", getGroupMembers);

// Group posts routes
router.get("/:id/posts", getGroupPosts);
router.post("/posts", createGroupPost);

// User groups
router.get("/users/:userId/groups", getUserGroups);

export default router;
