
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import {
  Star,
} from "lucide-react";

interface DiveSpot {
  id: string;
  name: string;
  latitude: string;
  longitude: string,
  locationName: string,
  location: string;
  depth: number;
  difficulty: string;
  description: string;
  bestSeason: string;
  directions: string;
  imageUrl: string;
}



function DiveSpotCard({
  diveSpot,
  selectedPlace,
  setSelectedPlace,
}: {
  diveSpot: DiveSpot;
  selectedPlace: string | null;
  setSelectedPlace: (id: string | null) => void;
}) {
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
                {4.5}{" "}
                <Star className="w-3 h-3 ml-1 fill-amber-400 text-amber-400" />
              </span>
              <span className="text-muted-foreground">
                (12)
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
