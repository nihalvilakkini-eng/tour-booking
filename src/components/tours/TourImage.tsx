"use client";

import Image from "next/image";
import { useState } from "react";

type TourImageProps = {
  image?: string;
  images?: string[];
  alt: string;
  className?: string;
};

const fallbackImage = "/tour-placeholder.svg";

export default function TourImage({
  image,
  images,
  alt,
  className,
}: TourImageProps) {
  const imageSource =
    [image, ...(images ?? [])].find(
      (candidate) => typeof candidate === "string" && candidate.trim()
    )?.trim() ?? fallbackImage;
  const [source, setSource] = useState(imageSource);

  return (
    <Image
      src={source}
      alt={alt}
      className={className}
      fill
      loading="lazy"
      decoding="async"
      sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
      unoptimized
      onError={() => setSource(fallbackImage)}
    />
  );
}
