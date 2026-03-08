"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { useMintedMediaMap } from "@/features/media/hooks";

export type MediaViewerDialogItem = {
  id: string;
  mediaObjectId: string;
  width: number;
  height: number;
  caption?: string | null;
  alt: string;
};

export function MediaViewerDialog({
  items,
  open,
  initialIndex = 0,
  onOpenChange,
  renderSidebar,
}: {
  items: MediaViewerDialogItem[];
  open: boolean;
  initialIndex?: number;
  onOpenChange: (open: boolean) => void;
  renderSidebar?: (activeItem: MediaViewerDialogItem) => React.ReactNode;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  const normalizedItems = useMemo(
    () => items.filter((item) => item.width > 0 && item.height > 0),
    [items],
  );
  const dialogUrls = useMintedMediaMap(
    normalizedItems.map((item) => item.mediaObjectId),
    "dialog",
    open && normalizedItems.length > 0,
  );

  const activeItem =
    normalizedItems[Math.min(index, Math.max(normalizedItems.length - 1, 0))] ??
    null;

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
    }
  }, [initialIndex, open]);

  useEffect(() => {
    if (!carouselApi || !open) return;
    carouselApi.scrollTo(initialIndex, true);
    setIndex(initialIndex);
  }, [carouselApi, initialIndex, open]);

  useEffect(() => {
    if (!carouselApi) return;

    const syncIndex = () => {
      setIndex(carouselApi.selectedScrollSnap());
    };

    syncIndex();
    carouselApi.on("select", syncIndex);
    carouselApi.on("reInit", syncIndex);

    return () => {
      carouselApi.off("select", syncIndex);
      carouselApi.off("reInit", syncIndex);
    };
  }, [carouselApi]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setIndex(initialIndex);
        }
        onOpenChange(nextOpen);
      }}
    >
      {activeItem ? (
        <DialogContent
          containerClassName="p-0"
          showCloseButton={false}
          className="relative h-dvh max-h-dvh w-full max-w-none rounded-none border-0 bg-background p-0 text-foreground shadow-none ring-0 md:max-w-[min(100vw-2rem,72rem)] md:rounded-2xl"
        >
          <div className="absolute right-4 top-4 z-30">
            <DialogClose
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                />
              }
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex h-full flex-col md:flex-row">
            <div className="relative min-h-[55vh] flex-1 bg-muted/30 md:min-h-full">
              {dialogUrls.isPending ? (
                <div className="flex h-full items-center justify-center">
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ startIndex: initialIndex }}
                  className="flex h-full items-center"
                >
                  <CarouselContent className="ml-0 h-full items-center">
                    {normalizedItems.map((item) => {
                      const src =
                        dialogUrls.urlMap.get(item.mediaObjectId) ?? "";
                      return (
                        <CarouselItem
                          key={item.id}
                          className="flex h-full items-center pl-0"
                        >
                          <div className="flex h-full w-full items-center justify-center p-4">
                            {src ? (
                              <Image
                                src={src}
                                alt={item.alt}
                                width={item.width}
                                height={item.height}

                                className="max-h-full w-auto max-w-full rounded-[0.5rem] object-contain"
                                unoptimized
                              />
                            ) : (
                              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  {normalizedItems.length > 1 ? (
                    <>
                      <CarouselPrevious className="left-4 top-1/2 z-20 -translate-y-1/2 bg-background/90" />
                      <CarouselNext className="right-4 top-1/2 z-20 -translate-y-1/2 bg-background/90" />
                      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground">
                        {index + 1} / {normalizedItems.length}
                      </div>
                    </>
                  ) : null}
                </Carousel>
              )}
            </div>

            {renderSidebar ? (
              <aside className="flex w-full max-w-md flex-col border-t bg-background md:border-l md:border-t-0">
                {renderSidebar(activeItem)}
              </aside>
            ) : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
