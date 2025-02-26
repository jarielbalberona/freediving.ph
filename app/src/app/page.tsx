"use client"

import Image from "next/image"
import { Card } from "@/components/ui/card"
import { useRef } from "react"

interface ImageData {
  src: string
  alt: string
  title: string
}

interface MoodBoardProps {
  images: ImageData[]
}

export default function Home() {
    const images = [
    {
      src: "/images/samples/1.jpg",
      alt: "Coffee cup branding",
      title: "Coffee Cup Design",
    },
    {
      src: "/images/samples/11.jpg",
      alt: "Palm tree geometric pattern",
      title: "Geometric Patterns",
    },
    {
      src: "/images/samples/13.jpg",
      alt: "Retail display",
      title: "Store Display",
    },
    {
      src: "/images/samples/10.jpg",
      alt: "Palm tree illustration",
      title: "Palm Tree Art",
    },
    {
      src: "/images/samples/12.jpg",
      alt: "Abstract shapes",
      title: "Abstract Designs",
    },
    {
      src: "/images/samples/2.jpg",
      alt: "Illuminated cafe sign",
      title: "Café Signage",
    },
    {
      src: "/images/samples/6.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/4.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/5.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/7.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/8.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/9.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/9.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/3.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/7.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/8.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
    {
      src: "/images/samples/3.jpg",
      alt: "Palm tree photograph",
      title: "Tropical Vibes",
    },
  ]
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] auto-rows-[8px] gap-4">
        {images.map((image, index) => (
          <MoodBoardItem key={index} image={image} />
        ))}
      </div>
    </div>
  )
}

function MoodBoardItem({ image }: { image: ImageData }) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <Card ref={cardRef} className="group relative overflow-hidden rounded-lg [grid-row-end:span_var(--row-span,20)]">
      <div className="relative w-full h-full">
        <Image
          src={image.src || "/placeholder.svg"}
          alt={image.alt}
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-sm font-medium">{image.title}</h3>
        </div>
      </div>
    </Card>
  )
}
