import express, { Router } from "express";

import ModerationController from "@/app/moderation/moderation.controller";
import { clerkAuthMiddleware, requirePolicy } from "@/middlewares/clerk.middleware";

export const moderationRouter: Router = (() => {
	const router = express.Router();

	router.use(clerkAuthMiddleware, requirePolicy("reports.moderate"));

	router.patch("/threads/:threadId/lock", (req, res) => {
		new ModerationController(req, res).lockThread();
	});

	router.patch("/threads/:threadId/remove", (req, res) => {
		new ModerationController(req, res).removeThread();
	});

	router.patch("/users/:userId/suspension", (req, res) => {
		new ModerationController(req, res).suspendUser();
	});

	router.patch("/users/:userId/feature-restrictions", (req, res) => {
		new ModerationController(req, res).setUserFeatureRestriction();
	});

	router.get("/threads/:threadId/pseudonyms", (req, res) => {
		new ModerationController(req, res).revealThreadPseudonyms();
	});

	return router;
})();
