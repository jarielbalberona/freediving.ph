import Image from "next/image";
import { Clapperboard, Heart, MessageCircleMore } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProfilePost } from "@/features/profile/types";

type ProfileTileProps = {
  post: ProfilePost;
  onOpen: (post: ProfilePost) => void;
};

const formatMetric = (value?: number): string =>
  new Intl.NumberFormat().format(value ?? 0);

export function ProfileTile({ post, onOpen }: ProfileTileProps) {
  const thumbUrl = post.thumbUrl || "/images/samples/1.jpg";

  return (
    <Button
      variant="ghost"
      className="group relative h-auto w-full rounded-none p-0 hover:bg-transparent"
      onClick={() => onOpen(post)}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={thumbUrl}
          alt={`Post ${post.id}`}
          fill
          className="object-cover transition-transform duration-300 md:group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 220px"
        />
        {post.mediaType === "video" ? (
          <div className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground backdrop-blur-sm">
            <Clapperboard className="size-3.5" />
          </div>
        ) : null}
        <div className="absolute inset-0 hidden items-center justify-center gap-5 bg-foreground/65 text-background opacity-0 transition-opacity md:flex md:group-hover:opacity-100">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Heart className="size-4 fill-current" />
            <span>{formatMetric(post.likeCount)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <MessageCircleMore className="size-4 fill-current" />
            <span>{formatMetric(post.commentCount)}</span>
          </div>
        </div>
      </div>
    </Button>
  );
}
