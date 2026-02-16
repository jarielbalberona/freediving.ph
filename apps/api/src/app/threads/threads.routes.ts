import express, { Router } from "express";
import { clerkAuthMiddleware } from "@/middlewares/clerk.middleware";

import ThreadsController from "@/app/threads/threads.controller";

export const threadsRouter: Router = (() => {
	const router = express.Router();

	// Thread routes
	router
		.route("/")
		.get((req, res) => {
			new ThreadsController(req, res).retrieveAllThreads();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).createThreads();
		});

	router
		.route("/:id")
		.get((req, res) => {
			new ThreadsController(req, res).retrieveThreads();
		})
		.put(clerkAuthMiddleware, async (req, res) => {
			new ThreadsController(req, res).updateThreads();
		});

	// Comments routes
	router
		.route("/:id/comments")
		.get((req, res) => {
			new ThreadsController(req, res).getComments();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
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

	return router;
})();
