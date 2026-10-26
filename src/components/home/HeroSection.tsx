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
    </section>
  );
}
