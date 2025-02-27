import { useRef } from "react"

import Image from "next/image"
import { Card } from "@/components/ui/img-card"

interface ImageData {
  src: string
  alt: string
  title: string
}

interface MoodBoardProps {
  images: ImageData[]
}

export default function MoodBoardItem({ image }: { image: ImageData }) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <Card ref={cardRef} className="group relative overflow-hidden rounded-lg [grid-row-end:span_var(--row-span,20)]">
      <div className="relative w-full h-full">
        <Image
          src={image?.src || "/placeholder.svg"}
          alt={image?.alt}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          onLoad={({ target }) => {
            const { naturalWidth, naturalHeight } = target as HTMLImageElement;
            const aspectRatio = naturalHeight / naturalWidth
            const rowSpan = Math.ceil(aspectRatio * 20)
            if (cardRef.current) {
              cardRef.current.style.setProperty("--row-span", rowSpan.toString())
            }
          }}
        />
        <div className="absolute inset-0 transition-opacity duration-300 opacity-0 bg-gradient-to-b from-transparent via-transparent to-black/60 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transition-transform duration-300 transform translate-y-full group-hover:translate-y-0">
          <h3 className="text-sm font-medium">{image.title}</h3>
        </div>
      </div>
    </Card>
  )
}
