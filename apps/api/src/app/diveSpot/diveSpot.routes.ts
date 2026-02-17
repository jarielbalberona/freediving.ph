import express, { Router } from "express";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/auth";

import DiveSpotController from "@/app/diveSpot/diveSpot.controller";

export const diveSpotRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/")
		.get((req, res) => {
			new DiveSpotController(req, res).retrieveAllDiveSpot();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new DiveSpotController(req, res).createDiveSpot();
		});

	router
		.route("/:id")
		.get((req, res) => {
			new DiveSpotController(req, res).retrieveDiveSpot();
		})
		.put(clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
			new DiveSpotController(req, res).updateDiveSpot();
		});

	router.patch("/:id/review", clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
		new DiveSpotController(req, res).reviewDiveSpot();
	});

	return router;
})();
