import express, { Router } from "express";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/auth";

import UserServicesController from "@/app/userServices/userServices.controller";

export const userServicesRouter: Router = (() => {
	const router = express.Router();

	// Service CRUD routes
	router
		.route("/")
		.get((req, res) => {
			new UserServicesController(req, res).getAllServices();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new UserServicesController(req, res).createService();
		});

	router
		.route("/:id")
		.get((req, res) => {
			new UserServicesController(req, res).getServiceById();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new UserServicesController(req, res).updateService();
		});

	// User service routes
	router.get("/users/:userId", (req, res) => {
		new UserServicesController(req, res).getUserServices();
	});

	// Service booking routes
	router
		.route("/bookings")
		.post(clerkAuthMiddleware, async (req, res) => {
			new UserServicesController(req, res).createBooking();
		});

	router.get("/:id/bookings", clerkAuthMiddleware, (req, res) => {
		new UserServicesController(req, res).getServiceBookings();
	});

	router.get("/users/:userId/bookings", clerkAuthMiddleware, (req, res) => {
		new UserServicesController(req, res).getUserBookings();
	});

	router.put("/bookings/:id/status", clerkAuthMiddleware, async (req, res) => {
		new UserServicesController(req, res).updateBookingStatus();
	});

	// Service review routes
	router
		.route("/reviews")
		.post(clerkAuthMiddleware, async (req, res) => {
			new UserServicesController(req, res).createReview();
		});

	router.get("/:id/reviews", (req, res) => {
		new UserServicesController(req, res).getServiceReviews();
	});

	return router;
})();
