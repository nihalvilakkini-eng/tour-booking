"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TourImage from "@/components/tours/TourImage";

type Tour = {
  _id: string;
  title: string;
  description: string;
  destination: string;
  activityType: string;
  price: number;
  currency?: string;
  duration: number;
  durationUnit: "hours" | "days";
  image?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
};

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("all");
  const [activity, setActivity] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("latest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Read destination from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedDestination = params.get("destination");

    if (selectedDestination) {
      setDestination(selectedDestination.trim());
    }
  }, []);

  // Load tours
  useEffect(() => {
    async function loadTours() {
      try {
        const response = await fetch("/api/tours", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load tours");
        }

        setTours(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load tours"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTours();
  }, []);

  // Get available destinations
  const destinations = useMemo(
    () =>
      Array.from(
        new Set(tours.map((tour) => tour.destination).filter(Boolean))
      ),
    [tours]
  );

  // Get available activities
  const activities = useMemo(
    () =>
      Array.from(
        new Set(tours.map((tour) => tour.activityType).filter(Boolean))
      ),
    [tours]
  );

  // Filter and sort tours
  const filteredTours = useMemo(() => {
    let result = tours.filter((tour) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        !keyword ||
        tour.title?.toLowerCase().includes(keyword) ||
        tour.destination?.toLowerCase().includes(keyword) ||
        tour.activityType?.toLowerCase().includes(keyword);

      // Case-insensitive destination matching
      const matchesDestination =
        destination === "all" ||
        tour.destination?.trim().toLowerCase().includes(
          destination.trim().toLowerCase()
        );

      const matchesActivity =
        activity === "all" || tour.activityType === activity;

      const matchesMin =
        minPrice === "" || tour.price >= Number(minPrice);

      const matchesMax =
        maxPrice === "" || tour.price <= Number(maxPrice);

      return (
        matchesSearch &&
        matchesDestination &&
        matchesActivity &&
        matchesMin &&
        matchesMax
      );
    });

    // Sorting
    if (sort === "low") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sort === "high") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      result = [...result].sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
      );
    }

    return result;
  }, [
    tours,
    search,
    destination,
    activity,
    minPrice,
    maxPrice,
    sort,
  ]);

  // Reset all filters
  function resetFilters() {
    setSearch("");
    setDestination("all");
    setActivity("all");
    setMinPrice("");
    setMaxPrice("");
    setSort("latest");

    window.history.replaceState(null, "", "/tours");
  }

  return (
    <main className="tours-page dark-tours-page">
      <section
        className="tours-hero"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2000&q=85")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="tours-hero-overlay" />

        <div className="tours-hero-content">
          <span className="tours-eyebrow">
            ✦ SIGNATURE EXPEDITIONS &amp; GOLDEN HORIZONS
          </span>

          <h1>
            Follow the golden trail
            <br />
            <span>to extraordinary places.</span>
          </h1>

          <p>
            From sweeping desert dunes to private cultural odysseys, explore
            curated journeys designed for unforgettable moments.
          </p>

          <div className="tour-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Search destinations, desert safaris, or experiences..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tours"
            />

            <a href="#tour-results">Explore</a>
          </div>

          <small className="public-browse-note">
            Browse all curated expeditions freely. No login required.
          </small>
        </div>
      </section>

      <section className="tours-content" id="tour-results">
        <div className="tours-heading">
          <div>
            <span className="section-eyebrow">
              CURATED COLLECTION
            </span>

            <h2>Signature expeditions &amp; tours</h2>

            <p>
              Filter by destination, activity, or budget to tailor your next
              adventure.
            </p>
          </div>

          <span className="tour-count">
            {loading
              ? "Loading..."
              : `${filteredTours.length} experiences`}
          </span>
        </div>

        {/* Filters */}
        <div className="tour-filter-panel">
          <div className="filter-field">
            <label htmlFor="destination">Destination</label>

            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="all">All destinations</option>

              {/* Keep URL destination available in dropdown */}
              {destination !== "all" &&
                !destinations.includes(destination) && (
                  <option value={destination}>
                    {destination}
                  </option>
                )}

              {destinations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="activity">Activity type</label>

            <select
              id="activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              <option value="all">All activities</option>

              {activities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="minPrice">Minimum price (₹)</label>

            <input
              id="minPrice"
              type="number"
              min="0"
              placeholder="Min price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="maxPrice">Maximum price (₹)</label>

            <input
              id="maxPrice"
              type="number"
              min="0"
              placeholder="Max price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="sort">Sort by</label>

            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">Latest</option>
              <option value="low">Price: Low to high</option>
              <option value="high">Price: High to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>

          <button
            type="button"
            className="reset-filters"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="tours-message">
            <div className="tour-spinner" />

            <p>Finding amazing experiences for you...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="tours-message">
            <h3>Unable to load tours</h3>

            <p>{error}</p>

            <button
              className="reset-filters"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {/* No results */}
        {!loading && !error && filteredTours.length === 0 && (
          <div className="tours-message">
            <span className="empty-icon">⌕</span>

            <h3>No tours found</h3>

            <p>
              Try a different destination or change your filters.
            </p>

            <button
              className="reset-filters"
              onClick={resetFilters}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Tour cards */}
        {!loading && !error && filteredTours.length > 0 && (
          <div className="tour-grid">
            {filteredTours.map((tour) => (
              <article className="tour-card" key={tour._id}>
                <Link
                  href={`/tours/${tour._id}`}
                  className="tour-image-link"
                  aria-label={`View ${tour.title}`}
                >
                  <div className="tour-card-image">
                    <TourImage
                      image={tour.image}
                      images={tour.images}
                      alt={tour.title}
                    />

                    <span className="tour-category">
                      {tour.activityType}
                    </span>
                  </div>
                </Link>

                <div className="tour-card-body">
                  <p className="tour-location">
                    <span>⌖</span> {tour.destination}
                  </p>

                  <h3>
                    <Link href={`/tours/${tour._id}`}>
                      {tour.title}
                    </Link>
                  </h3>

                  <p className="tour-description">
                    {tour.description}
                  </p>

                  <div className="tour-card-meta">
                    <span>
                      ◷ {tour.duration} {tour.durationUnit}
                    </span>

                    <span>
                      ★ {(tour.rating ?? 0).toFixed(1)}
                      {tour.reviewCount
                        ? ` (${tour.reviewCount})`
                        : ""}
                    </span>
                  </div>

                  <div className="tour-card-footer">
                    <div className="tour-price">
                      <small>Starting from</small>

                      <strong>
                        {tour.currency === "INR" || !tour.currency
                          ? "₹"
                          : `${tour.currency} `}
                        {tour.price.toLocaleString("en-IN")}
                      </strong>

                      <small>/ person</small>
                    </div>

                    <Link
                      href={`/tours/${tour._id}`}
                      className="tour-view-button"
                    >
                      View tour <span>→</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .dark-tours-page {
          background: #0b1116 !important;
          color: #f1f5f9 !important;
          min-height: 100vh;
        }

      .tours-hero {
          position: relative;
          background-color: #0b1116 !important;
          border-bottom: none !important;
          overflow: hidden;
        }

        .tours-hero-overlay {
          inset: -2px !important;
          background: linear-gradient(
            180deg,
            rgba(11, 17, 22, 0.5) 0%,
            rgba(11, 17, 22, 0.82) 65%,
            #0b1116 98%,
            #0b1116 100%
          ) !important;
        }

        .tours-content {
          position: relative;
          background-color: #0b1116 !important;
          border-top: none !important;
          margin-top: -2px;
        }

        .tours-eyebrow,
        .section-eyebrow {
          color: #f59e0b !important;
          letter-spacing: 0.14em;
        }

        .tours-hero-content h1,
        .tours-heading h2 {
          color: #ffffff !important;
        }

        .tours-hero-content h1 span {
          color: #fbbf24 !important;
        }

        .tours-hero-content p,
        .tours-heading p,
        .public-browse-note {
          color: #cbd5e1 !important;
        }

        .tour-search {
          background: rgba(18, 26, 34, 0.85) !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45) !important;
        }

        .tour-search span {
          color: #fbbf24 !important;
        }

        .tour-search input {
          background: transparent !important;
          color: #f8fafc !important;
        }

        .tour-search input::placeholder {
          color: #94a3b8 !important;
        }

        .tour-search a {
          background: #f59e0b !important;
          color: #090d11 !important;
          font-weight: 800 !important;
        }

        .tour-search a:hover {
          background: #fbbf24 !important;
        }

        .tour-count {
          background: rgba(245, 158, 11, 0.12) !important;
          border: 1px solid rgba(245, 158, 11, 0.3) !important;
          color: #fbbf24 !important;
        }

        .tour-filter-panel {
          background: #121a22 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35) !important;
        }

        .filter-field label {
          color: #cbd5e1 !important;
        }

        .filter-field select,
        .filter-field input {
          background: #0b1116 !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #f8fafc !important;
        }

        .filter-field select:focus,
        .filter-field input:focus {
          border-color: #f59e0b !important;
          outline: none;
        }

        .reset-filters {
          background: rgba(245, 158, 11, 0.12) !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          color: #fbbf24 !important;
          font-weight: 700 !important;
        }

        .reset-filters:hover {
          background: #f59e0b !important;
          color: #090d11 !important;
        }

        .tours-message {
          background: #121a22 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #94a3b8 !important;
        }

        .tours-message h3 {
          color: #ffffff !important;
        }

        .tour-spinner {
          border-color: rgba(255, 255, 255, 0.1) !important;
          border-top-color: #f59e0b !important;
        }

        .tour-card {
          background: #121a22 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4) !important;
          transition: transform 0.22s ease, border-color 0.22s ease !important;
        }

        .tour-card:hover {
          transform: translateY(-4px);
          border-color: rgba(245, 158, 11, 0.38) !important;
        }

        .tour-category {
          background: rgba(11, 17, 22, 0.85) !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          color: #fbbf24 !important;
          backdrop-filter: blur(8px);
        }

        .tour-location,
        .tour-description,
        .tour-card-meta {
          color: #94a3b8 !important;
        }

        .tour-card-meta span:last-child {
          color: #fbbf24 !important;
        }

        .tour-card-body h3 a {
          color: #ffffff !important;
          transition: color 0.18s ease;
        }

        .tour-card:hover .tour-card-body h3 a {
          color: #fbbf24 !important;
        }

        .tour-card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .tour-price small {
          color: #64748b !important;
        }

        .tour-price strong {
          color: #fbbf24 !important;
        }

        .tour-view-button {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          color: #f8fafc !important;
          font-weight: 700 !important;
        }

        .tour-view-button:hover {
          background: #f59e0b !important;
          border-color: #f59e0b !important;
          color: #090d11 !important;
        }
          .tours-hero-content h1 {
          font-size: clamp(2.35rem, 4.4vw, 3.65rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -0.03em !important;
          max-width: 720px;
        }

        .tours-hero-content p {
          font-size: 1.02rem !important;
          line-height: 1.6 !important;
          max-width: 540px !important;
          margin-top: 14px !important;
        }

        .tour-search {
          max-width: 640px !important;
          height: 56px !important;
          padding: 6px 6px 6px 18px !important;
          border-radius: 16px !important;
          margin-top: 28px !important;
        }

        .tour-search input {
          font-size: 0.95rem !important;
        }

        .tour-search a {
          height: 42px !important;
          padding: 0 22px !important;
          border-radius: 11px !important;
          font-size: 0.9rem !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </main>
  );
}