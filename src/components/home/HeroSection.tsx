"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import SearchBar from "./SearchBar";

type ToursResponse = {
  data?: Array<{
    images?: string[];
  }>;
};

export default function HeroSection() {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHeroImage() {
      try {
        const result = await apiRequest<ToursResponse>("/api/tours");
        const tour = result.data?.find(
          (item) =>
            typeof item.images?.[0] === "string" &&
            item.images[0].trim().length > 0
        );
        const image = tour?.images?.[0]?.trim();

        if (active && image) {
          setBackgroundImage(image);
        }
      } catch (error) {
        console.error("Unable to load the hero image:", error);
      }
    }

    void loadHeroImage();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="hero"
      style={
        backgroundImage
          ? { backgroundImage: `url("${backgroundImage}")` }
          : undefined
      }
    >
      <div className="hero-overlay" />

      <div className="container hero-content">
        <span className="hero-badge">
          ✦ YOUR NEXT ADVENTURE STARTS HERE
        </span>

        <h1>
          Discover places.
          <br />
          <span>Collect memories.</span>
        </h1>

        <p>
          Explore extraordinary destinations and unforgettable
          activities with experiences made for you.
        </p>

        <div className="hero-actions">
          <Link href="/tours" className="primary-btn">
            Explore Experiences →
          </Link>
          <span className="hero-note">Find your next adventure</span>
        </div>

        <SearchBar />
      </div>
    </section>
  );
}
