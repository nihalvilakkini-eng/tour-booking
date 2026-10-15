"use client";

import Link from "next/link";

export interface Tour {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  destination?: string;
  location?: string;
  category?: string;
  price?: number;
  currency?: string;
  rating?: number;
  duration?: string;
  image?: string;
  images?: string[];
}

export default function TourCard({ tour }: { tour: Tour }) {
  const tourId = tour._id || tour.id;
  const title = tour.title || tour.name || "Untitled Tour";
  const image =
    tour.image ||
    tour.images?.[0] ||
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900";

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={tourId ? `/tours/${tourId}` : "/tours"}>
        <div className="relative h-56 overflow-hidden bg-gray-100">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
          {tour.category && (
            <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
              {tour.category}
            </span>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            📍 {tour.destination || tour.location || "Explore destination"}
          </p>
          {typeof tour.rating === "number" && (
            <span className="text-sm font-semibold text-amber-600">
              ★ {tour.rating.toFixed(1)}
            </span>
          )}
        </div>

        <h2 className="line-clamp-1 text-xl font-bold text-gray-900">
          {title}
        </h2>

        <p className="line-clamp-2 min-h-10 text-sm leading-6 text-gray-600">
          {tour.description || "Discover an unforgettable travel experience."}
        </p>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-lg font-bold text-emerald-700">
              {typeof tour.price === "number"
                ? new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: tour.currency || "INR",
                    maximumFractionDigits: 0,
                  }).format(tour.price)
                : "Price unavailable"}
            </p>
          </div>

          {tour.duration && (
            <span className="text-sm text-gray-500">
              ◷ {tour.duration}
            </span>
          )}
        </div>

        <Link
          href={tourId ? `/tours/${tourId}` : "/tours"}
          className="block rounded-xl bg-emerald-700 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-800"
        >
          View Details →
        </Link>
      </div>
    </article>
  );
}