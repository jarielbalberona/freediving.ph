export type CropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AvatarTransformResult = {
  file: File;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
};

type BuildAvatarInput = {
  imageSrc: string;
  cropPixels: CropPixels;
  originalFileName: string;
  maxBytes?: number;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const OUTPUT_TYPES = ["image/webp", "image/jpeg"] as const;
const QUALITY_LEVELS = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.5, 0.45];
const MAX_DIMENSION_STEPS = [1024, 896, 768, 640, 512, 384, 320, 256];

export async function buildAvatarFromCrop(input: BuildAvatarInput): Promise<AvatarTransformResult> {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  const image = await loadImage(input.imageSrc);
  const cropped = drawCropToCanvas(image, input.cropPixels);
  return compressToLimit(cropped, input.originalFileName, maxBytes);
}

function drawCropToCanvas(image: HTMLImageElement, crop: CropPixels): HTMLCanvasElement {
  const sx = Math.max(0, Math.floor(crop.x));
  const sy = Math.max(0, Math.floor(crop.y));
  const sw = Math.max(1, Math.floor(crop.width));
  const sh = Math.max(1, Math.floor(crop.height));
  const maxSw = Math.max(1, image.naturalWidth - sx);
  const maxSh = Math.max(1, image.naturalHeight - sy);
  const safeW = Math.min(sw, maxSw);
  const safeH = Math.min(sh, maxSh);

  const canvas = document.createElement("canvas");
  canvas.width = safeW;
  canvas.height = safeH;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("failed to create canvas context");
  }

  ctx.drawImage(image, sx, sy, safeW, safeH, 0, 0, safeW, safeH);
  return canvas;
}

async function compressToLimit(
  source: HTMLCanvasElement,
  originalFileName: string,
  maxBytes: number,
): Promise<AvatarTransformResult> {
  const baseMax = Math.max(source.width, source.height);
  const sizeSteps = MAX_DIMENSION_STEPS.filter((step) => step <= baseMax);
  if (!sizeSteps.includes(baseMax)) {
    sizeSteps.unshift(baseMax);
  }
  if (sizeSteps.length === 0) {
    sizeSteps.push(baseMax);
  }

  let smallest: AvatarTransformResult | null = null;
  for (const maxDimension of sizeSteps) {
    const scaled = scaleCanvas(source, maxDimension);
    for (const mimeType of OUTPUT_TYPES) {
      for (const quality of QUALITY_LEVELS) {
        const blob = await canvasToBlob(scaled, mimeType, quality);
        if (!blob) continue;

        const result = toResult(blob, originalFileName, scaled.width, scaled.height);
        if (!smallest || result.sizeBytes < smallest.sizeBytes) {
          smallest = result;
        }
        if (result.sizeBytes <= maxBytes) {
          return result;
        }
      }
    }
  }

  if (!smallest) {
    throw new Error("failed to process selected image");
  }

  throw new Error(
    `Image is still too large after compression (${formatBytes(smallest.sizeBytes)}). Try a tighter crop.`,
  );
}

function scaleCanvas(source: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement {
  const longest = Math.max(source.width, source.height);
  if (longest <= maxDimension) {
    return source;
  }
  const scale = maxDimension / longest;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const scaled = document.createElement("canvas");
  scaled.width = width;
  scaled.height = height;
  const ctx = scaled.getContext("2d");
  if (!ctx) {
    throw new Error("failed to create canvas context");
  }
  ctx.drawImage(source, 0, 0, width, height);
  return scaled;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function toResult(
  blob: Blob,
  originalFileName: string,
  width: number,
  height: number,
): AvatarTransformResult {
  const mimeType = blob.type || "image/jpeg";
  const extension = extensionForMime(mimeType);
  const file = new File([blob], replaceExtension(originalFileName, extension), { type: mimeType });
  return {
    file,
    width,
    height,
    mimeType,
    sizeBytes: file.size,
  };
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function replaceExtension(fileName: string, extension: string): string {
  const sanitized = fileName.trim() || "avatar";
  const base = sanitized.replace(/\.[^/.]+$/, "");
  return `${base}.${extension}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("failed to load selected image"));
    image.src = src;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

