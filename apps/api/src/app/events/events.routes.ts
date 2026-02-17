import express, { Router } from "express";
import { clerkAuthMiddleware, optionalClerkAuthMiddleware, requireRole } from "@/middlewares/auth";

import EventsController from "@/app/events/events.controller";

export const eventsRouter: Router = (() => {
	const router = express.Router();

	// Event CRUD routes
	router
		.route("/")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new EventsController(req, res).getAllEvents();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new EventsController(req, res).createEvent();
		});

	router
		.route("/:id")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new EventsController(req, res).getEventById();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new EventsController(req, res).updateEvent();
		});

	router.patch("/:id/moderate-remove", clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
		new EventsController(req, res).moderateRemoveEvent();
	});

	// Event attendee routes
	router
		.route("/:id/attendees")
		.get(optionalClerkAuthMiddleware, (req, res) => {
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
