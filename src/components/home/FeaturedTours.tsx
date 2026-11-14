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

  const displayedTours = isSearching
    ? filteredTours
    : filteredTours.slice(0, 6);

  return (
    <section className="section featured" id="tour-results">
      <div className="container">
        <div className="section-top">
          <div>
            <span className="eyebrow">
              {isSearching ? "FIND YOUR EXPERIENCE" : "SIGNATURE EXPEDITIONS"}
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

        {loading && (
          <p className="status">
            Discovering amazing experiences...
          </p>
        )}

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

        {!loading && !error && tours.length === 0 && (
          <p className="status">
            No tours available yet. Add a tour using your operator dashboard.
          </p>
        )}

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
          background: #0e151c;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
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
          color: #f59e0b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .section-heading {
          color: #ffffff;
        }

        .section-description {
          color: #94a3b8;
        }

        .view-all {
          flex-shrink: 0;
          color: #fbbf24;
          font-weight: 700;
          font-size: 14px;
          transition: color 0.18s ease;
        }

        .view-all:hover {
          color: #fde68a;
        }

        .experience-categories {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px 20px;
          margin: 0 0 28px;
        }

        .experience-categories > span {
          color: #94a3b8;
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
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          background: #121a22;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 600;
          transition: border-color 0.18s ease, color 0.18s ease,
            background-color 0.18s ease;
        }

        .experience-categories a:hover {
          border-color: rgba(245, 158, 11, 0.45);
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
        }

        .tour-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .tour-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: #121a22;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          transition: transform 0.22s ease, box-shadow 0.22s ease,
            border-color 0.22s ease;
        }

        .tour-card:hover {
          transform: translateY(-4px);
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 20px 38px rgba(0, 0, 0, 0.55);
        }

        .tour-image {
          position: relative;
          display: block;
          width: 100%;
          height: 235px;
          overflow: hidden;
          background: #0b1116;
        }

        .category-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          background: rgba(11, 17, 22, 0.82);
          backdrop-filter: blur(8px);
          color: #fbbf24;
          font-size: 11px;
          font-weight: 700;
        }

        .tour-content {
          padding: 20px;
        }

        .tour-location {
          margin: 0 0 10px;
          color: #94a3b8;
          font-size: 12px;
        }

        h3 {
          margin: 0 0 10px;
          color: #ffffff;
          font-size: 19px;
          letter-spacing: 0;
          transition: color 0.18s ease;
        }

        .tour-card:hover h3 {
          color: #fbbf24;
        }

        .tour-description {
          display: -webkit-box;
          min-height: 42px;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #94a3b8;
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
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .price-label {
          color: #64748b;
          font-size: 11px;
        }

        .tour-price {
          margin: 5px 0 0;
          color: #fbbf24;
          font-size: 19px;
          font-weight: 800;
        }

        .tour-price span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 400;
        }

        .rating {
          color: #fbbf24;
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
          padding: 9px 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: border-color 0.18s ease, background-color 0.18s ease,
            color 0.18s ease;
        }

        .view-details:hover {
          border-color: #f59e0b;
          background: #f59e0b;
          color: #090d11;
        }

        .status {
          padding: 30px 0;
          color: #94a3b8;
          line-height: 1.8;
        }

        .error {
          color: #fda4af;
        }

        .retry {
          padding: 9px 16px;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          font-weight: 600;
          cursor: pointer;
        }

        .empty-results {
          padding: 40px 20px;
          text-align: center;
          border: 1px dashed rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          background: #121a22;
        }

        .empty-results h3 {
          color: #ffffff;
          margin-bottom: 8px;
        }

        .empty-results p {
          color: #94a3b8;
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