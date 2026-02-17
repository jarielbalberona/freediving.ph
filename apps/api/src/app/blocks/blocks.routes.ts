import express, { Router } from "express";

import BlocksController from "@/app/blocks/blocks.controller";
import { clerkAuthMiddleware } from "@/middlewares/auth";

export const blocksRouter: Router = (() => {
  const router = express.Router();

  router.use(clerkAuthMiddleware);

  router.get("/", (req, res) => new BlocksController(req, res).list());
  router.post("/", (req, res) => new BlocksController(req, res).create());
  router.delete("/:blockedUserId", (req, res) => new BlocksController(req, res).delete());

  return router;
})();
