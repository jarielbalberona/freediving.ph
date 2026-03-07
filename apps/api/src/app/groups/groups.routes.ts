import express, { Router } from "express";
import { clerkAuthMiddleware, optionalClerkAuthMiddleware, requireRole } from "@/middlewares/auth";

import GroupsController from "@/app/groups/groups.controller";

export const groupsRouter: Router = (() => {
	const router = express.Router();

	// Group CRUD routes
	router
		.route("/")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new GroupsController(req, res).getAllGroups();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new GroupsController(req, res).createGroup();
		});

	router
		.route("/:id")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new GroupsController(req, res).getGroupById();
		})
		.put(clerkAuthMiddleware, requireRole("EDITOR"), async (req, res) => {
			new GroupsController(req, res).updateGroup();
		});

	// Group member routes
	router
		.route("/:id/members")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new GroupsController(req, res).getGroupMembers();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new GroupsController(req, res).addMember();
		});

	router.post("/:id/join", clerkAuthMiddleware, async (req, res) => {
		new GroupsController(req, res).joinGroup();
	});

	router.post("/:id/members/:userId/:action", clerkAuthMiddleware, async (req, res) => {
		new GroupsController(req, res).reviewJoinRequest();
	});

	router.delete("/:id/members/:userId", clerkAuthMiddleware, async (req, res) => {
		new GroupsController(req, res).removeMember();
	});

	// Group post routes
	router
		.route("/:id/posts")
		.get(optionalClerkAuthMiddleware, (req, res) => {
			new GroupsController(req, res).getGroupPosts();
		})
		.post(clerkAuthMiddleware, async (req, res) => {
			new GroupsController(req, res).createPost();
		});

	return router;
})();
