import express, { Router } from "express";

import ThreadsController from "@/app/threads/threads.controller";

export const threadsRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/")
    .get((req, res) => {
			new ThreadsController(req, res).retrieveAllThreads();
		})
		.post(async (req, res) => {
			new ThreadsController(req, res).createThreads();
		});

	router
		.route("/:id")
		.get((req, res) => {
			new ThreadsController(req, res).retrieveThreads();
		})
		.put(async (req, res) => {
			new ThreadsController(req, res).updateThreads();
		});

	return router;
})();
