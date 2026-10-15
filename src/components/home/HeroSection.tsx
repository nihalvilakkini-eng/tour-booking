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

      <style jsx>{`
        .hero {
          position: relative;
          display: flex;
          align-items: center;
          min-height: 610px;
          padding: 70px 0 105px;
          overflow: hidden;
          background-image: url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85");
          background-position: center;
          background-size: cover;
          color: white;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(9, 30, 26, 0.86) 0%,
            rgba(9, 30, 26, 0.62) 48%,
            rgba(9, 30, 26, 0.15) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-block;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.1);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 25px 0 18px;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 1.12;
          letter-spacing: -2.5px;
          font-weight: 800;
        }

        h1 span {
          color: #82e5c5;
        }

        p {
          max-width: 540px;
          color: #edf4f0;
          font-size: 17px;
          line-height: 1.8;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 26px;
        }

        .hero-note {
          font-size: 13px;
          color: #e1ebe5;
        }

        @media (max-width: 640px) {
          .hero {
            min-height: 650px;
            padding: 55px 0 80px;
            background-position: 57% center;
          }

          h1 {
            letter-spacing: -1.5px;
          }

          p {
            font-size: 15px;
          }

          .hero-note {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
