"use client";

import Image from "next/image";
import { useState } from "react";

type TourImageProps = {
  image?: string;
  images?: string[];
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

const fallbackImage = "/tour-placeholder.svg";

export default function TourImage({
  image,
  images,
  alt,
  className,
  loading = "lazy",
}: TourImageProps) {
  const imageSource =
    [...(images ?? []), image].find(
      (candidate) => typeof candidate === "string" && candidate.trim()
    )?.trim() ?? fallbackImage;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = failedSource === imageSource ? fallbackImage : imageSource;

  return (
    <Image
      key={imageSource}
      src={source}
      alt={alt}
      className={className}
      fill
      loading={loading}
      decoding="async"
      sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
      unoptimized
      onError={() => setFailedSource(imageSource)}
    />
  );
}
