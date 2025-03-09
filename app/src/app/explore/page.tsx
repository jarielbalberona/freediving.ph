import { apiCall } from "@/lib/api";
import ExploreView from "./explore-view"

export default async function Explore() {
  const {data: diveSpots} : any = await apiCall("/dive-spots")
  return (
    <>
    <ExploreView initialDiveSpots={diveSpots} />
    </>
  );
}
