
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import {
  Star,
} from "lucide-react";

interface DiveSpot {
  id: number;
  name: string;
  locationName?: string;
  depth?: number;
  difficulty?: string;
  imageUrl?: string;
  avgRating?: number;
  ratingCount?: number;
  commentCount?: number;
}



function DiveSpotCard({
  diveSpot,
  selectedPlace,
  setSelectedPlace,
}: {
  diveSpot: DiveSpot;
  selectedPlace: number | null;
  setSelectedPlace: (id: number | null) => void;
}) {
  const avgRating = typeof diveSpot.avgRating === "number" ? diveSpot.avgRating.toFixed(1) : "0.0";
  const ratingCount = diveSpot.ratingCount ?? 0;
  const commentCount = diveSpot.commentCount ?? 0;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedPlace === diveSpot?.id ? "ring-2 ring-primary" : ""
      }`}
      onClick={() => setSelectedPlace(diveSpot.id)}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="flex-1 p-2">
            <h3 className="font-semibold">{diveSpot.name}</h3>
            <div className="flex items-center gap-1 text-sm">
              <span className="flex items-center">
                {avgRating}{" "}
                <Star className="w-3 h-3 ml-1 fill-amber-400 text-amber-400" />
              </span>
              <span className="text-muted-foreground">
                ({ratingCount} ratings{commentCount > 0 ? `, ${commentCount} comments` : ""})
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{diveSpot.difficulty}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {diveSpot.depth}
            </div>
          </div>
          <div className="h-[100px] w-[100px] overflow-hidden">
            <Image
              src={diveSpot.imageUrl || "/placeholder.svg"}
              alt={diveSpot.name}
              className="object-cover w-full h-full"
              width={1000}
              height={1000}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export default DiveSpotCard;
