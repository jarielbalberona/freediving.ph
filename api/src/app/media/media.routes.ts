import express, { Router } from "express";
import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import MediaController from "@/app/media/media.controller";

import globalUpload from "@/multer/globalConfig";

export const mediaRouter: Router = (() => {
	const router = express.Router();

	router.post("/", globalUpload.single("file"), async (req, res) => {
		new MediaController(req, res).createMedia();
  });

  router
    .route("/presigned-url/:username")
    .get((req, res) => {
      new MediaController(req, res).createPresignedS3URL();
    })

	return router;
})();
