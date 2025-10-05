import { Router } from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  registerForEvent,
  cancelEventRegistration,
  getEventAttendees,
  getUserEvents,
} from "./events.controller";

const router = Router();

// Event routes
router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", createEvent);
router.put("/:id", updateEvent);

// Event registration routes
router.post("/register", registerForEvent);
router.post("/:id/cancel", cancelEventRegistration);
router.get("/:id/attendees", getEventAttendees);

// User events
router.get("/users/:userId/events", getUserEvents);

export default router;
