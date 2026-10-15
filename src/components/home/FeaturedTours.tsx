
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Tour = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  destination?: string;
  location?: string;
  category?: string;
  price?: number;
  image?: string;
  images?: string[];
  rating?: number;
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

const fallbackImage =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80";

export default function FeaturedTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTours() {
      try {
        const result = await apiRequest<TourResponse>("/api/tours");
        if (active) setTours(getTours(result).slice(0, 6));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load tours."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTours();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="section featured">
      <div className="container">
        <div className="section-top">
          <div>
            <span className="eyebrow">HANDPICKED FOR YOU</span>
            <h2 className="section-heading">Popular experiences</h2>
            <p className="section-description">
              Find your next unforgettable adventure.
            </p>
          </div>

          <Link href="/tours" className="view-all">
            View all tours →
          </Link>
        </div>

        {loading && (
          <p className="status">Discovering amazing experiences...</p>
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

        {!loading && !error && tours.length > 0 && (
          <div className="tour-grid">
            {tours.map((tour, index) => {
              const id = tour._id ?? tour.id ?? "";
              const title = tour.title ?? tour.name ?? "Explore this tour";
              const image =
                tour.image ?? tour.images?.[0] ?? fallbackImage;

              return (
                <article className="tour-card" key={id || index}>
                  <Link
                    href={id ? `/tours/${id}` : "/tours"}
                    className="tour-image"
                    style={{ backgroundImage: `url("${image}")` }}
                    aria-label={`View ${title}`}
                  >
                    <span className="category-tag">
                      {tour.category ?? "Adventure"}
                    </span>
                  </Link>

                  <div className="tour-content">
                    <p className="tour-location">
                      📍 {tour.destination ?? tour.location ?? "Discover more"}
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
                        <span className="price-label">Starting from</span>
                        <p className="tour-price">
                          {typeof tour.price === "number"
                            ? `₹${tour.price.toLocaleString("en-IN")}`
                            : "See price"}
                          <span> / person</span>
                        </p>
                      </div>

                      {typeof tour.rating === "number" && (
                        <span className="rating">
                          ★ {tour.rating.toFixed(1)}
                        </span>
                      )}
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
          background: #f7f9f7;
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
          letter-spacing: 1.8px;
        }

        .view-all {
          flex-shrink: 0;
          color: #087f6e;
          font-weight: 700;
          font-size: 14px;
        }

        .tour-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .tour-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #e9eeea;
          border-radius: 16px;
          background: white;
          transition: transform 0.25s, box-shadow 0.25s;
        }

        .tour-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(23, 43, 39, 0.09);
        }

        .tour-image {
          position: relative;
          display: block;
          height: 225px;
          background-size: cover;
          background-position: center;
        }

        .category-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          padding: 7px 11px;
          border-radius: 30px;
          background: white;
          color: #087f6e;
          font-size: 11px;
          font-weight: 700;
        }

        .tour-content {
          padding: 19px;
        }

        .tour-location {
          margin: 0 0 10px;
          color: #718079;
          font-size: 12px;
        }

        h3 {
          margin: 0 0 10px;
          font-size: 19px;
          letter-spacing: -0.4px;
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

          .tour-image {
            height: 230px;
          }
        }
      `}</style>
    </section>
  );
}
