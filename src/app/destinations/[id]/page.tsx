"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TourImage from "@/components/tours/TourImage";

type Destination = {
  _id?: string;
  name: string;
  country: string;
  state?: string;
  city?: string;
  description: string;
  image: string;
  search?: string;
  order?: number;
};

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

const OBJECT_ID = /^[a-f\d]{24}$/i;
const PLACEHOLDER_IMAGE = "/tour-placeholder.svg";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function fallbackDestination(name: string): Destination {
  return {
    name,
    country: "",
    description: "",
    image: PLACEHOLDER_IMAGE,
    search: name,
  };
}

function locationLabel(destination: Destination) {
  return (
    [destination.city, destination.state, destination.country]
      .filter(Boolean)
      .join(", ") || destination.country
  );
}

export default function DestinationPackagesPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const decodedId = useMemo(() => safeDecode(id), [id]);
  const isObjectId = OBJECT_ID.test(id);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [toursLoading, setToursLoading] = useState(true);
  const [toursError, setToursError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDestination() {
      try {
        const response = await fetch("/api/destinations", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load destination");
        }

        const list = Array.isArray(result.data) ? result.data : [];
        const term = decodedId.toLowerCase();
        const found =
          list.find((item: Destination) => String(item._id) === id) ||
          list.find((item: Destination) =>
            [item.name, item.search, item.country, item.state, item.city]
              .map((value) => String(value ?? "").toLowerCase())
              .some(
                (value) =>
                  value &&
                  (value === term || value.includes(term) || term.includes(value))
              )
          );

        if (cancelled) return;

        if (found) {
          setDestination(found);
        } else if (isObjectId) {
          setDestination(null);
        } else {
          setDestination(fallbackDestination(decodedId));
        }
      } catch {
        if (cancelled) return;

        if (!isObjectId) {
          setDestination(fallbackDestination(decodedId));
        }
      }
    }

    void loadDestination();

    return () => {
      cancelled = true;
    };
  }, [id, decodedId, isObjectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTours() {
      setToursLoading(true);
      setToursError("");

      try {
        const url = isObjectId
          ? `/api/tours?destinationId=${encodeURIComponent(id)}`
          : `/api/tours?destination=${encodeURIComponent(decodedId)}`;

        const response = await fetch(url, { cache: "no-store" });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load packages");
        }

        if (cancelled) return;

        setTours(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (cancelled) return;

        setTours([]);
        setToursError(
          err instanceof Error ? err.message : "Unable to load packages"
        );
      } finally {
        if (!cancelled) setToursLoading(false);
      }
    }

    void loadTours();

    return () => {
      cancelled = true;
    };
  }, [id, decodedId, isObjectId]);

  const displayName =
    destination?.name || (isObjectId ? "Destination" : decodedId) || "Destination";
  const displayLocation = destination ? locationLabel(destination) : "";
  const heroImage = destination?.image;
  const heroStyle =
    heroImage && heroImage !== PLACEHOLDER_IMAGE
      ? {
          backgroundImage: `linear-gradient(90deg, rgba(8, 31, 26, 0.9) 0%, rgba(8, 31, 26, 0.66) 48%, rgba(8, 31, 26, 0.22) 100%), url(${heroImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }
      : undefined;

  return (
    <main className="tours-page">
      <section className="tours-hero" style={heroStyle}>
        <div className="tours-hero-overlay" />
        <div className="tours-hero-content">
          <span className="tours-eyebrow">POPULAR DESTINATION</span>
          <h1>{displayName}</h1>
          <p>
            {destination?.description ||
              "Explore active tour packages in this destination."}
          </p>
          {displayLocation && (
            <p className="destination-location">{displayLocation}</p>
          )}
        </div>
      </section>

      <section className="tours-content">
        <div className="tours-heading">
          <div>
            <span className="section-eyebrow">TOUR PACKAGES</span>
            <h2>Experiences in {displayName}</h2>
            <p>Bookable packages matching this destination.</p>
          </div>
          <span className="tour-count">
            {toursLoading ? "Loading..." : `${tours.length} package(s)`}
          </span>
        </div>

        {toursLoading && (
          <div className="tours-message">
            <div className="tour-spinner" />
            <p>Finding packages for {displayName}...</p>
          </div>
        )}

        {!toursLoading && toursError && (
          <div className="tours-message">
            <h3>Unable to load packages</h3>
            <p>{toursError}</p>
            <button
              type="button"
              className="reset-filters"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {!toursLoading && !toursError && tours.length === 0 && (
          <div className="tours-message">
            <span className="empty-icon">⌕</span>
            <h3>No packages found</h3>
            <p>
              There are no active tour packages for this destination yet.
            </p>
            <Link href="/tours" className="reset-filters">
              Browse all tours
            </Link>
          </div>
        )}

        {!toursLoading && !toursError && tours.length > 0 && (
          <div className="tour-grid">
            {tours.map((tour) => (
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
                    <Link href={`/tours/${tour._id}`}>{tour.title}</Link>
                  </h3>

                  <p className="tour-description">{tour.description}</p>

                  <div className="tour-card-meta">
                    <span>
                      ◷ {tour.duration} {tour.durationUnit}
                    </span>
                    <span>
                      ★ {(tour.rating ?? 0).toFixed(1)}
                      {tour.reviewCount ? ` (${tour.reviewCount})` : ""}
                    </span>
                  </div>

                  <div className="tour-card-footer">
                    <div className="tour-price">
                      <small>Starting from</small>
                      <strong>
                        {tour.currency === "INR" || !tour.currency
                          ? "₹"
                          : `${tour.currency} `}
                        {Number(tour.price ?? 0).toLocaleString("en-IN")}
                      </strong>
                      <small>/ person</small>
                    </div>

                    <Link
                      href={`/tours/${tour._id}`}
                      className="tour-view-button"
                    >
                      View Details <span>→</span>
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
