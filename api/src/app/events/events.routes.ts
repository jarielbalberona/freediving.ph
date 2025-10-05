import express, { Router } from "express";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/clerk.middleware";

import EventsController from "@/app/events/events.controller";

export const eventsRouter: Router = (() => {
	const router = express.Router();

	// Event CRUD routes
	router
		.route("/")
		.get((req, res) => {
			new EventsController(req, res).getAllEvents();
		})
		.post(clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
			new EventsController(req, res).createEvent();
		});

	router
		.route("/:id")
		.get((req, res) => {
			new EventsController(req, res).getEventById();
		})
		.put(clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
			new EventsController(req, res).updateEvent();
		});

	// Event attendee routes
	router
		.route("/:id/attendees")
		.get((req, res) => {
			new EventsController(req, res).getEventAttendees();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new EventsController(req, res).addAttendee();
		});

	router.delete("/:id/attendees/:userId", clerkAuthMiddleware, async (req, res) => {
		new EventsController(req, res).removeAttendee();
	});

	return router;
})();
