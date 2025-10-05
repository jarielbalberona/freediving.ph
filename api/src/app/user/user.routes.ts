import express, { Router } from "express";
import { clerkAuthMiddleware, requireRole } from "@/middlewares/clerk.middleware";

import UserController from "@/app/user/user.controller";

export const userRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/")
		.get(clerkAuthMiddleware, requireRole("ADMINISTRATOR"), (req, res) => {
			new UserController(req, res).index();
		})
		.delete(clerkAuthMiddleware, (req, res) => {
			new UserController(req, res).delete();
		});

	router.get("/export", clerkAuthMiddleware, requireRole("ADMINISTRATOR"), (req, res) => {
		new UserController(req, res).export();
	});

	return router;
})();
