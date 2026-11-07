
"use client";

import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";

type HeroSectionProps = {
  onSearch: (destination: string, activity: string) => void;
  onClear: () => void;
};

export default function HeroSection({
  onSearch,
  onClear,
}: HeroSectionProps) {
  return (
    <section className="hero">
      <Image
        src="/images/wayora-hero.jpg"
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="hero-image"
      />
      <div className="hero-overlay" />

      <div className="container hero-content">
        <span className="hero-badge">
          ✦ YOUR NEXT ADVENTURE STARTS HERE
        </span>

        <h1>
          Where will you go
          <br />
          <span>next?</span>
        </h1>

        <p>
          From peaceful beaches to breathtaking mountain escapes. Find your
          perfect destination and experience the extraordinary.
        </p>

        <div className="hero-actions">
          <Link href="#tour-results" className="primary-btn">
            Explore Tours <span aria-hidden="true">→</span>
          </Link>
          <span className="hero-note">
            Find your next adventure
          </span>
        </div>

        <SearchBar
          onSearch={onSearch}
          onClear={onClear}
        />
      </div>
    </section>
  );
}
