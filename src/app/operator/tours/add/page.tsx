
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tour = {
  _id: string;
  title: string;
  description?: string;
  destination: string;
  activityType?: string;
  price: number;
  currency?: string;
  duration: number;
  durationUnit?: string;
  maxParticipants?: number;
  images?: string[];
  isActive?: boolean;
  createdAt?: string;
};

export default function OperatorToursPage() {
  const router = useRouter();

  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tours?mine=true", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        if (response.status === 401) {
          throw new Error("Please log in to view your tours.");
        }

        if (response.status === 403) {
          throw new Error("This page is available to tour operators only.");
        }

        throw new Error(result.message || "Could not load your tours.");
      }

      setTours(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTours();
  }, [loadTours]);

  const filteredTours = tours.filter((tour) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      tour.title?.toLowerCase().includes(query) ||
      tour.destination?.toLowerCase().includes(query) ||
      tour.activityType?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (tour: Tour) => {
    const currency = tour.currency || "INR";

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(tour.price);
    } catch {
      return `${currency} ${tour.price}`;
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087f6e]">
              Operator dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              My Tours
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Manage your experiences and keep your tour listings up to date.
            </p>
          </div>

          <Link
            href="/operator/tour/add"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#087f6e] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#066354]"
          >
            <span className="text-xl">+</span>
            Add New Tour
          </Link>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">My Tours</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "—" : tours.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Activity Types</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading
                ? "—"
                : new Set(
                    tours.map((tour) => tour.activityType).filter(Boolean)
                  ).size}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Destinations</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading
                ? "—"
                : new Set(
                    tours.map((tour) => tour.destination).filter(Boolean)
                  ).size}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Your tour listings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search by tour name, destination or activity type.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadTours()}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          <div className="mt-5">
            <label htmlFor="tour-search" className="sr-only">
              Search tours
            </label>
            <input
              id="tour-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tours, destinations, activities..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#087f6e] focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadTours()}
                className="mt-3 text-sm font-bold text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse overflow-hidden rounded-2xl border border-gray-100"
                >
                  <div className="h-48 bg-gray-200" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-3/4 rounded bg-gray-200" />
                    <div className="h-4 w-1/2 rounded bg-gray-200" />
                    <div className="h-10 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : !error && filteredTours.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl text-[#087f6e]">
                {search ? "⌕" : "+"}
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                {search ? "No matching tours" : "No tours yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                {search
                  ? "Try a different search term."
                  : "Create your first tour and start sharing your experience with travelers."}
              </p>

              {!search && (
                <Link
                  href="/operator/tour/add"
                  className="mt-5 inline-flex rounded-xl bg-[#087f6e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#066354]"
                >
                  Create Your First Tour
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTours.map((tour) => (
                <article
                  key={tour._id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                >
                  <div className="relative h-52 bg-emerald-50">
                    {tour.images?.[0] ? (
                      <img
                        src={tour.images[0]}
                        alt={tour.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        No tour image
                      </div>
                    )}

                    {tour.activityType && (
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#087f6e] shadow-sm">
                        {tour.activityType}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-sm text-gray-500">
                      <span className="mr-1">⌖</span>
                      {tour.destination}
                    </p>

                    <h3 className="mt-2 line-clamp-2 text-lg font-bold text-gray-900">
                      {tour.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                      {tour.description || "Explore this tour on WAYORA."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="rounded-lg bg-gray-100 px-3 py-2">
                        {tour.duration} {tour.durationUnit || "hours"}
                      </span>

                      {tour.maxParticipants != null && (
                        <span className="rounded-lg bg-gray-100 px-3 py-2">
                          Up to {tour.maxParticipants} guests
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-xs text-gray-500">Per person</p>
                        <p className="mt-1 text-lg font-bold text-[#087f6e]">
                          {formatPrice(tour)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/operator/dashboard/tours/${tour._id}`
                          )
                        }
                        className="rounded-xl border border-[#087f6e] px-4 py-2.5 text-sm font-semibold text-[#087f6e] transition hover:bg-emerald-50"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
