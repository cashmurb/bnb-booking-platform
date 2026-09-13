"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function Slideshow({
  images,
  alt,
  intervalMs = 4000,
  priority = false,
}: {
  images: string[];
  alt: string;
  intervalMs?: number;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`${alt} photo ${i + 1}`}
          fill
          priority={priority && i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
