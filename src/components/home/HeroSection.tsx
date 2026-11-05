"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-overlay" />

      <div className="container hero-content">
        <span className="hero-badge">
          ✦ YOUR NEXT ADVENTURE STARTS HERE
        </span>

        <h1>
          Discover Your
          <br />
          <span>Next Journey</span>
        </h1>

        <p>
          Find unforgettable tours and experiences around the world.
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
