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
    <section className="hero dark-luxury-hero">
      <Image
        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85"
        alt="Golden hour mountain peaks expedition"
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="hero-image opacity-65 object-cover"
      />
      <div className="hero-overlay dark-luxury-overlay" />

      <div className="container hero-content">
        <span className="hero-badge">
          ✦ CURATED EXPEDITIONS &amp; LUXURY ESCAPES
        </span>

        <h1>
          Discover peaks beyond
          <br />
          <span className="text-amber-400">the horizon.</span>
        </h1>

        <p>
          Step into golden-hour mountain trails, untouched valleys, and
          extraordinary journeys crafted for discerning explorers.
        </p>

        <div className="hero-actions">
          <Link href="#tour-results" className="primary-btn">
            Explore Expeditions <span aria-hidden="true">→</span>
          </Link>
          <span className="hero-note">
            Handpicked destinations across the globe
          </span>
        </div>

        <SearchBar
          onSearch={onSearch}
          onClear={onClear}
        />
      </div>

      <style jsx>{`
        .dark-luxury-hero {
          position: relative;
          background: #0b1116;
          color: #f8fafc;
        }

        .dark-luxury-overlay {
          background: linear-gradient(
            180deg,
            rgba(11, 17, 22, 0.48) 0%,
            rgba(11, 17, 22, 0.76) 62%,
            #0b1116 100%
          ) !important;
        }

        .hero-badge {
          border: 1px solid rgba(245, 158, 11, 0.4) !important;
          background: rgba(245, 158, 11, 0.14) !important;
          color: #fbbf24 !important;
        }

        h1 {
          color: #ffffff !important;
        }

        h1 span {
          color: #fbbf24 !important;
        }

        p {
          color: #cbd5e1 !important;
        }

        :global(.dark-luxury-hero .primary-btn) {
          background: #f59e0b !important;
          color: #090d11 !important;
          font-weight: 800 !important;
          box-shadow: 0 10px 26px rgba(245, 158, 11, 0.28) !important;
        }

        :global(.dark-luxury-hero .primary-btn:hover) {
          background: #fbbf24 !important;
        }

        .hero-note {
          color: #94a3b8 !important;
        }
          .hero-content h1 {
          font-size: clamp(2.35rem, 4.4vw, 3.65rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.03em !important;
          max-width: 720px;
        }

        .hero-content p {
          font-size: 1.02rem !important;
          line-height: 1.6 !important;
          max-width: 540px !important;
          margin-top: 14px !important;
        }
      `}</style>
    </section>
  );
}