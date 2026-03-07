import express, { Router } from "express";
import { clerkAuthMiddleware, optionalClerkAuthMiddleware } from "@/middlewares/auth";
import { ROUTE_RATE_LIMITS } from "@/core/abuseControls";
import { createFeatureRateLimiter } from "@/rateLimiter";

import ThreadsController from "@/app/threads/threads.controller";

export const threadsRouter: Router = (() => {
	const router = express.Router();
	const threadCreateLimiter = createFeatureRateLimiter({
		windowMs: 60 * 60 * 1000,
		max: ROUTE_RATE_LIMITS.threadCreatesPerHour,
		message: "Too many thread creation attempts. Please try again later."
	});
	const threadReplyLimiter = createFeatureRateLimiter({
		windowMs: 60 * 60 * 1000,
		max: ROUTE_RATE_LIMITS.threadRepliesPerHour,
		message: "Too many replies. Please slow down."
	});

	// Thread routes
	router
		.route("/")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new ThreadsController(req, res).retrieveAllThreads();
		})
		.post(clerkAuthMiddleware, threadCreateLimiter, async (req, res) => {
			new ThreadsController(req, res).createThreads();
		});

	router
		.route("/:id")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new ThreadsController(req, res).retrieveThreads();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).updateThreads();
		})
		.delete(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).deleteThreads();
		});

	// Comments routes
	router
		.route("/:id/comments")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new ThreadsController(req, res).getComments();
		})
		.post(clerkAuthMiddleware, threadReplyLimiter, async (req, res) => {
			new ThreadsController(req, res).createComment();
		});

	// Reactions routes
	router
		.route("/:id/reactions")
		.post(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).addReaction();
		})
		.delete(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).removeReaction();
		});

	router.patch("/:id/mode", clerkAuthMiddleware, async (req, res) => {
		new ThreadsController(req, res).setThreadMode();
	});

	router.get("/:id/pseudonym", clerkAuthMiddleware, async (req, res) => {
		new ThreadsController(req, res).getOwnPseudonym();
	});

	return router;
})();
