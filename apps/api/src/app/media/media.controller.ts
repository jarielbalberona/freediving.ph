import { Request, Response } from "express";
import { S3Client, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import MediaService from "@/app/media/media.service";

import { ApiController } from "@/controllers/base/api.controller";
import { processImage } from "@/multer/processImage";
import { ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

const S3Configuration: S3ClientConfig = {
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
    region: process.env.AWS_REGION,
};

const s3 = new S3Client(S3Configuration);

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
    const username = this.request.params.username;
    const { type, ext } = this.request.query

    const params = {
      // media/presigned-url/jarielbalberona/?type=videos?&ext=.png
      Bucket: process.env.AWS_S3_FPH_BUCKET_NAME,
      Key: `media/${username}/${type}/${Date.now()}${ext}`,
      ContentType: "image/png", // "image/png" or "video/mp4"
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3, command, { expiresIn: 12 * 60 });

    return this.apiResponse.sendResponse({
      status: status.HTTP_200_OK,
      message: "Presigned URL generated.",
      data: { url: url, key: params.Key },
    });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      this.apiResponse.internalServerError("Internal Server Error");
    }
  }
}
