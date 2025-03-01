"use client"
import MoodBoardItem from "@/components/ui/mood-board"
import { images } from "@/data/dummy"

export default function Home() {

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

