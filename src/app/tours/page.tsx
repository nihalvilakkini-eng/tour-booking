"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

  const destinations = useMemo(
    () =>
      Array.from(
        new Set(tours.map((tour) => tour.destination).filter(Boolean))
      ),
    [tours]
  );

  const activities = useMemo(
    () =>
      Array.from(
        new Set(tours.map((tour) => tour.activityType).filter(Boolean))
      ),
    [tours]
  );

  const filteredTours = useMemo(() => {
    let result = tours.filter((tour) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        !keyword ||
        tour.title?.toLowerCase().includes(keyword) ||
        tour.destination?.toLowerCase().includes(keyword) ||
        tour.activityType?.toLowerCase().includes(keyword);

      const matchesDestination =
        destination === "all" || tour.destination === destination;

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
  }, [tours, search, destination, activity, minPrice, maxPrice, sort]);

  function resetFilters() {
    setSearch("");
    setDestination("all");
    setActivity("all");
    setMinPrice("");
    setMaxPrice("");
    setSort("latest");
  }

  return (
    <main className="tours-page">
      <section className="tours-hero">
        <div className="tours-hero-overlay" />

        <div className="tours-hero-content">
          <span className="tours-eyebrow">DISCOVER YOUR NEXT JOURNEY</span>

          <h1>
            Find your next
            <br />
            <span>great escape.</span>
          </h1>

          <p>
            Discover amazing destinations, unforgettable activities
            and experiences around the world.
          </p>

          <div className="tour-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Search destinations or experiences..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tours"
            />

            <a href="#tour-results">Explore</a>
          </div>

          <small className="public-browse-note">
            Explore tours freely. No login required.
          </small>
        </div>
      </section>

      <section className="tours-content" id="tour-results">
        <div className="tours-heading">
          <div>
            <span className="section-eyebrow">EXPLORE EXPERIENCES</span>
            <h2>Discover amazing tours</h2>
            <p>Find the right experience for your next adventure.</p>
          </div>

          <span className="tour-count">
            {loading ? "Loading..." : `${filteredTours.length} experiences`}
          </span>
        </div>

        <div className="tour-filter-panel">
          <div className="filter-field">
            <label htmlFor="destination">Destination</label>
            <select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="all">All destinations</option>
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

        {loading && (
          <div className="tours-message">
            <div className="tour-spinner" />
            <p>Finding amazing experiences for you...</p>
          </div>
        )}

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

        {!loading && !error && filteredTours.length === 0 && (
          <div className="tours-message">
            <span className="empty-icon">⌕</span>
            <h3>No tours found</h3>
            <p>Try a different destination or change your filters.</p>
            <button className="reset-filters" onClick={resetFilters}>
              Clear all filters
            </button>
          </div>
        )}

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
                    <img
                      src={
                        tour.images?.[0] ||
                        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80"
                      }
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
    </main>
  );
}