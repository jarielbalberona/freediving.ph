"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildAvatarFromCrop, type AvatarTransformResult } from "../lib/avatar-transform";

type AvatarCropDialogProps = {
  open: boolean;
  imageSrc: string;
  fileName: string;
  onOpenChange: (open: boolean) => void;
  onDone: (result: AvatarTransformResult) => void;
};

export function AvatarCropDialog({
  open,
  imageSrc,
  fileName,
  onOpenChange,
  onDone,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const transformed = await buildAvatarFromCrop({
        imageSrc,
        cropPixels: {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        },
        originalFileName: fileName,
      });
      onDone(transformed);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process image";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
          <DialogDescription>
            Crop your photo and we will compress it before upload to stay under 5 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative h-[360px] w-full overflow-hidden rounded-lg bg-black/80">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="avatar-zoom" className="text-sm font-medium">
              Zoom
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!croppedAreaPixels || isProcessing}>
            {isProcessing ? "Processing..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
