import { serverAPICall } from "@/lib/api";
import ExploreView from "./explore-view"

export default async function Explore() {
  const {data: diveSpots} : any = await serverAPICall("/dive-spots")
  return (
    <>
    <ExploreView initialDiveSpots={diveSpots} />
    </>
  );
}
