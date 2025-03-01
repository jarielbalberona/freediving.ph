import { Request, Response } from "express";
import AWS from "aws-sdk";
import MediaService from "@/app/media/media.service";

import { ApiController } from "@/controllers/base/api.controller";
import { processImage } from "@/multer/processImage";
import { ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

const s3 = new AWS.S3();

export default class MediaController extends ApiController {
  protected mediaService: MediaService;
  /**
   * Construct the controller
   *
   * @param request
   * @param response
   */
  constructor(request: Request, response: Response) {
    super(request, response);
    this.mediaService = new MediaService();
  }

  async createMedia() {
    try {
      const urls = await processImage(this.request);

      return this.apiResponse.sendResponse({
        status: status.HTTP_200_OK,
        message: "Media uploaded successfully",
        data: urls,
      });
    } catch (error: unknown) {
      return this.apiResponse.sendResponse(
        error as ServiceApiResponse<unknown>
      );
    }
  }

  async createPresignedS3URL() {
    try {
      const { fileType } = this.request.query;

      if (!fileType) {
        return this.apiResponse.badResponse("Missing fileType");
      }

      const params = {
        Bucket: process.env.AWS_S3_FPH_BUCKET_NAME,
        Key: `uploads/${Date.now()}`,
        ContentType: fileType,
        Expires: 720,
        ACL: "public-read",
      };

      const uploadUrl = await s3.getSignedUrlPromise("putObject", params);

      return this.apiResponse.sendResponse({
        status: status.HTTP_200_OK,
        message: "Presigned URL generated.",
        data: { uploadUrl, key: params.Key },
      });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      this.apiResponse.internalServerError("Internal Server Error");
    }
  }
}
