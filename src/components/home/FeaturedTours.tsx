
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import TourImage from "@/components/tours/TourImage";

type FeaturedToursProps = {
  destination: string;
  activity: string;
  isSearching: boolean;
};

type Tour = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  destination?: string;
  location?: string;
  category?: string;
  activityType?: string;
  price?: number;
  image?: string;
  images?: string[];
  rating?: number;
  duration?: number;
  durationUnit?: string;
};

type TourResponse =
  | Tour[]
  | {
      tours?: Tour[];
      data?: Tour[] | { tours?: Tour[] };
    };

function getTours(result: TourResponse): Tour[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.tours)) return result.tours;
  if (Array.isArray(result.data)) return result.data;

  if (result.data && !Array.isArray(result.data)) {
    return result.data.tours ?? [];
  }

  return [];
}

function formatDuration(tour: Tour) {
  if (typeof tour.duration !== "number" || !Number.isFinite(tour.duration)) {
    return "";
  }

  const unit =
    tour.durationUnit === "hours"
      ? tour.duration === 1
        ? "hour"
        : "hours"
      : tour.durationUnit === "days"
        ? tour.duration === 1
          ? "day"
          : "days"
        : "";

  return unit ? `${tour.duration} ${unit}` : `${tour.duration}`;
}

export default function FeaturedTours({
  destination,
  activity,
  isSearching,
}: FeaturedToursProps) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch tours from existing API
  useEffect(() => {
    let active = true;

    async function loadTours() {
      try {
        setError("");

        const result = await apiRequest<TourResponse>("/api/tours");
        const allTours = getTours(result);

        const activityTypes = Array.from(
          new Set(
            allTours
              .map((tour) => tour.activityType?.trim())
              .filter(
                (activityType): activityType is string =>
                  Boolean(activityType)
              )
          )
        );

        if (active) {
          setTours(allTours);
          setCategories(activityTypes.slice(0, 6));
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load tours."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTours();

    return () => {
      active = false;
    };
  }, []);

  // Filter tours based on destination and activity
  const filteredTours = useMemo(() => {
    const searchDestination = destination.toLowerCase().trim();
    const searchActivity = activity.toLowerCase().trim();

    return tours.filter((tour) => {
      const tourDestination = (
        tour.destination ?? tour.location ?? ""
      ).toLowerCase();

      const tourActivity = (
        tour.activityType ?? tour.category ?? ""
      ).toLowerCase();

      const tourTitle = (
        tour.title ?? tour.name ?? ""
      ).toLowerCase();

      const tourDescription = (
        tour.description ?? ""
      ).toLowerCase();

      const matchesDestination =
        !searchDestination ||
        tourDestination.includes(searchDestination);

      const matchesActivity =
        !searchActivity ||
        tourActivity.includes(searchActivity) ||
        tourTitle.includes(searchActivity) ||
        tourDescription.includes(searchActivity);

      return matchesDestination && matchesActivity;
    });
  }, [tours, destination, activity]);

  // Show all matching tours during search.
  // Show only 6 tours on normal homepage.
  const displayedTours = isSearching
    ? filteredTours
    : filteredTours.slice(0, 6);

  return (
    <section className="section featured" id="tour-results">
      <div className="container">

        {/* Section Heading */}
        <div className="section-top">
          <div>
            <span className="eyebrow">
              {isSearching ? "FIND YOUR EXPERIENCE" : "TOUR PACKAGES"}
            </span>

            <h2 className="section-heading">
              {isSearching ? "Search Results" : "Tour packages"}
            </h2>

            <p className="section-description">
              {isSearching
                ? `${filteredTours.length} experiences found`
                : "Bookable packages with images, prices and durations."}
            </p>
          </div>

          {!isSearching && (
            <Link href="/tours" className="view-all">
              View all tours →
            </Link>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <p className="status">
            Discovering amazing experiences...
          </p>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="status error">
            <p>We couldn’t load tours from the server.</p>
            <p>{error}</p>

            <button
              className="retry"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {/* No Tours */}
        {!loading && !error && tours.length === 0 && (
          <p className="status">
            No tours available yet. Add a tour using your operator dashboard.
          </p>
        )}

        {/* Browse Categories */}
        {!isSearching &&
          !loading &&
          !error &&
          categories.length > 0 && (
            <nav
              className="experience-categories"
              aria-label="Browse by activity"
            >
              <span>Browse by experience</span>

              <div>
                {categories.map((category) => (
                  <Link
                    key={category}
                    href="/tours#tour-results"
                  >
                    {category}
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </nav>
          )}

        {/* Search Results Empty State */}
        {!loading &&
          !error &&
          tours.length > 0 &&
          displayedTours.length === 0 && (
            <div className="status empty-results">
              <h3>No tours found</h3>

              <p>
                We couldn’t find any matching experiences.
                Try another destination or activity.
              </p>
            </div>
          )}

        {/* Tour Cards */}
        {!loading &&
          !error &&
          displayedTours.length > 0 && (
            <div className="tour-grid">
              {displayedTours.map((tour, index) => {
                const id = tour._id ?? tour.id ?? "";
                const title =
                  tour.title ?? tour.name ?? "Explore this tour";
                const detailHref = id ? `/tours/${id}` : "/tours";
                const durationText = formatDuration(tour);

                return (
                  <article
                    className="tour-card"
                    key={id || index}
                  >
                    <Link
                      href={id ? `/tours/${id}` : "/tours"}
                      className="tour-image-link"
                      aria-label={`View ${title}`}
                    >
                      <div className="tour-image">
                        <TourImage
                          image={tour.image}
                          images={tour.images}
                          alt={title}
                          className="h-full w-full object-cover"
                          loading="eager"
                        />

                        <span className="category-tag">
                          {tour.activityType ??
                            tour.category ??
                            "Experience"}
                        </span>
                      </div>
                    </Link>

                    <div className="tour-content">
                      <p className="tour-location">
                        📍{" "}
                        {tour.destination ??
                          tour.location ??
                          "Discover more"}
                        {durationText ? ` · ⏱ ${durationText}` : ""}
                      </p>

                      <Link href={id ? `/tours/${id}` : "/tours"}>
                        <h3>{title}</h3>
                      </Link>

                      <p className="tour-description">
                        {tour.description ||
                          "Discover a memorable experience at this destination."}
                      </p>

                      <div className="tour-bottom">
                        <div>
                          <span className="price-label">
                            Starting from
                          </span>

                          <p className="tour-price">
                            {typeof tour.price === "number"
                              ? `₹${tour.price.toLocaleString("en-IN")}`
                              : "See price"}

                            <span> / person</span>
                          </p>
                        </div>

                        <div className="tour-actions">
                          {typeof tour.rating === "number" && (
                            <span className="rating">
                              ★ {tour.rating.toFixed(1)}
                            </span>
                          )}
                          <Link href={detailHref} className="view-details">
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </div>

      <style jsx>{`
        .featured {
          background: #f2f6f3;
          scroll-margin-top: 30px;
        }

        .section-top {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin-bottom: 32px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #087f6e;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .view-all {
          flex-shrink: 0;
          color: #087f6e;
          font-weight: 700;
          font-size: 14px;
        }

        .experience-categories {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 20px;
          margin: 0 0 24px;
        }

        .experience-categories > span {
          color: #64746b;
          font-size: 12px;
          font-weight: 700;
        }

        .experience-categories > div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .experience-categories a {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          padding: 0 12px;
          border: 1px solid #dfe8e2;
          border-radius: 6px;
          background: #fff;
          color: #34574b;
          font-size: 12px;
          font-weight: 600;
          transition: border-color 0.18s ease, color 0.18s ease,
            background-color 0.18s ease;
        }

        .experience-categories a:hover {
          border-color: #9dc8b6;
          background: #f0f7f2;
          color: #095443;
        }

        .tour-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .tour-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e1e8e3;
          border-radius: 8px;
          background: white;
          box-shadow: 0 8px 22px rgba(23, 45, 37, 0.045);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }

        .tour-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(23, 45, 37, 0.12);
        }

        .tour-image {
          position: relative;
          display: block;
          width: 100%;
          height: 235px;
          overflow: hidden;
        }

        .category-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          padding: 7px 11px;
          border-radius: 6px;
          background: white;
          color: #087f6e;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(12, 31, 25, 0.12);
        }

        .tour-content {
          padding: 20px;
        }

        .tour-location {
          margin: 0 0 10px;
          color: #718079;
          font-size: 12px;
        }

        h3 {
          margin: 0 0 10px;
          font-size: 19px;
          letter-spacing: 0;
        }

        .tour-description {
          display: -webkit-box;
          min-height: 42px;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #718079;
          font-size: 13px;
          line-height: 1.7;
        }

        .tour-bottom {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 10px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #edf0ed;
        }

        .price-label {
          color: #718079;
          font-size: 11px;
        }

        .tour-price {
          margin: 5px 0 0;
          font-size: 19px;
          font-weight: 800;
        }

        .tour-price span {
          color: #718079;
          font-size: 11px;
          font-weight: 400;
        }

        .rating {
          color: #a46b00;
          font-size: 13px;
          font-weight: 700;
        }

        .tour-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .view-details {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border: 1px solid #dfe8e2;
          border-radius: 8px;
          background: #fff;
          color: #087f6e;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          transition: border-color 0.18s ease, background-color 0.18s ease,
            color 0.18s ease;
        }

        .view-details:hover {
          border-color: #9dc8b6;
          background: #f0f7f2;
          color: #095443;
        }

        .status {
          padding: 30px 0;
          color: #718079;
          line-height: 1.8;
        }

        .error {
          color: #a32929;
        }

        .retry {
          padding: 9px 14px;
          border: 1px solid #087f6e;
          border-radius: 8px;
          background: white;
          color: #087f6e;
          cursor: pointer;
        }

        .empty-results {
          padding: 40px 20px;
          text-align: center;
          border: 1px dashed #cbdad0;
          border-radius: 10px;
          background: white;
        }

        .empty-results h3 {
          color: #172b27;
          margin-bottom: 8px;
        }

        .empty-results p {
          color: #718079;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .tour-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .section-top {
            align-items: start;
            flex-direction: column;
          }

          .tour-grid {
            grid-template-columns: 1fr;
          }

          .experience-categories {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .tour-image {
            height: 230px;
          }
        }
      `}</style>
    </section>
  );
}
