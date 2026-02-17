import { Request, Response } from "express";
import { S3Client, PutObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import MediaService from "@/app/media/media.service";

import { ApiController } from "@/controllers/base/api.controller";
import { processImage } from "@/multer/processImage";
import { ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";
import { withTimeout } from "@/utils/resilience";

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
    const username = String(this.request.params.username || "");
    const requestedType = String(this.request.query.type || "").toLowerCase();
    const requestedExt = String(this.request.query.ext || "").toLowerCase();
    const context = this.request.context;

    if (!context) {
      return this.apiResponse.unauthorizedResponse("User not authenticated");
    }

    const expectedUsername = context.username || String(context.appUserId ?? context.appUserId);
    if (username !== expectedUsername) {
      return this.apiResponse.forbiddenResponse("Cannot request upload URL for another user");
    }

    const allowedTypeToExt: Record<string, { exts: string[]; contentType: string }> = {
      images: { exts: [".jpg", ".jpeg", ".png", ".webp"], contentType: "image/jpeg" },
      videos: { exts: [".mp4", ".webm"], contentType: "video/mp4" }
    };

    const typeConfig = allowedTypeToExt[requestedType];
    if (!typeConfig || !typeConfig.exts.includes(requestedExt)) {
      return this.apiResponse.badResponse("Invalid upload type or extension");
    }

    const params = {
      // media/presigned-url/jarielbalberona/?type=videos?&ext=.png
      Bucket: process.env.AWS_S3_FPH_BUCKET_NAME,
      Key: `media/${expectedUsername}/${requestedType}/${Date.now()}${requestedExt}`,
      ContentType: typeConfig.contentType,
    };

    const command = new PutObjectCommand(params);
    const url = await withTimeout(
      () => getSignedUrl(s3, command, { expiresIn: 12 * 60 }),
      5000,
      "S3 presigned URL generation timed out"
    );

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
