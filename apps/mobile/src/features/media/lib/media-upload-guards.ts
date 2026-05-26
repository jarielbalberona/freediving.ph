import type { ImagePickerAsset } from "expo-image-picker";

export const MEDIA_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const MOMENT_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;
export const MOMENT_MAX_DURATION_SECONDS = 30;

const allowedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const allowedPhotoExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const allowedVideoTypes = new Set(["video/mp4", "video/quicktime"]);
const allowedVideoExtensions = new Set(["mp4", "mov"]);

const extensionFor = (asset: Pick<ImagePickerAsset, "fileName" | "uri">) =>
  (asset.fileName ?? asset.uri).split(".").pop()?.toLowerCase() ?? "";

export const filenameForAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => {
  const extension = extensionFor(asset);
  if (asset.fileName?.trim()) return asset.fileName.trim();
  return extension ? `${fallbackPrefix}.${extension}` : fallbackPrefix;
};

export const mimeTypeForAsset = (asset: ImagePickerAsset) => {
  if (asset.mimeType?.trim()) return asset.mimeType.trim().toLowerCase();
  const extension = extensionFor(asset);
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  return "";
};

export const validatePhotoAsset = (asset: ImagePickerAsset) => {
  if (asset.type !== "image") return "Choose a photo.";
  const mimeType = mimeTypeForAsset(asset);
  const extension = extensionFor(asset);
  if (!allowedPhotoTypes.has(mimeType) && !allowedPhotoExtensions.has(extension)) {
    return "Choose a JPEG, PNG, WebP, or GIF image.";
  }
  if (asset.fileSize && asset.fileSize > MEDIA_UPLOAD_LIMIT_BYTES) {
    return "Photos must be 10 MB or smaller.";
  }
  if (asset.width <= 0 || asset.height <= 0) {
    return "Choose a photo with readable dimensions.";
  }
  return null;
};

export const validateMomentAsset = (asset: ImagePickerAsset) => {
  if (asset.type !== "video") return "Choose a video.";
  const mimeType = mimeTypeForAsset(asset);
  const extension = extensionFor(asset);
  if (!allowedVideoTypes.has(mimeType) && !allowedVideoExtensions.has(extension)) {
    return "Choose an MP4 or MOV video.";
  }
  if (asset.fileSize && asset.fileSize > MOMENT_UPLOAD_LIMIT_BYTES) {
    return "Moments must be 200 MB or smaller.";
  }
  if (typeof asset.duration !== "number" || !Number.isFinite(asset.duration)) {
    return "Could not read video duration.";
  }
  if (asset.duration / 1000 > MOMENT_MAX_DURATION_SECONDS) {
    return "Trim your video before uploading.";
  }
  return null;
};
