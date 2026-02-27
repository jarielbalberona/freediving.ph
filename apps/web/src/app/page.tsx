"use client"
import MoodBoardItem from "@/components/ui/mood-board"
import { images } from "@/data/dummy"

export default function Home() {
  console.log("ORIGIN_URL", process.env.ORIGIN_URL)
  console.log("FPHGO_BASE_URL", process.env.FPHGO_BASE_URL)
  console.log("APP_URL", process.env.APP_URL)
  console.log("NEXT_PUBLIC_FPHGO_BASE_URL", process.env.NEXT_PUBLIC_FPHGO_BASE_URL)
  console.log("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL)
  console.log("NEXT_PUBLIC_GOOGLE_MAP_API", process.env.NEXT_PUBLIC_GOOGLE_MAP_API)
  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] auto-rows-[8px] gap-4">
        {images?.map((image, index) => (
          <MoodBoardItem key={index} image={image} />
        ))}
      </div>
    </div>
  )
}
