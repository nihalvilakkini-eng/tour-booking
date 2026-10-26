
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Tour = {
  _id: string;
  title: string;
  destination: string;
  activityType: string;
  duration: number;
  durationUnit: "hours" | "days";
  price: number;
  currency: string;
  maxParticipants: number;
  meetingPoint: string;
  images?: string[];
  isActive?: boolean;
  operator?: {
    name?: string;
    lastName?: string;
    email?: string;
  } | string;
  createdAt?: string;
};

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency || "INR"} ${price}`;
  }
}

export default function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tours", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load tours.");
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
    const searchText = search.trim().toLowerCase();

    if (!searchText) return true;

    return [
      tour.title,
      tour.destination,
      tour.activityType,
      tour.meetingPoint,
    ].some((value) => value?.toLowerCase().includes(searchText));
  });

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/dashboard"
          className="mb-6 inline-flex text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Manage Tours
            </h1>
            <p className="mt-2 text-gray-600">
              View and manage tours available on your platform.
            </p>
          </div>

          <Link
            href="/admin/dashboard/tours/create"
            className="inline-flex items-center justify-center rounded-xl bg-[#087f6e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#066354]"
          >
            + Create New Tour
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Active Tours Returned
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "—" : tours.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Search Results
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {loading ? "—" : filteredTours.length}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <label
            htmlFor="tour-search"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Search tours
          </label>
          <input
            id="tour-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, destination or activity..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#087f6e] focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadTours()}
              className="ml-3 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-600 shadow-sm">
            Loading tours...
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl">
              🧭
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {search ? "No matching tours found" : "No tours available yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {search
                ? "Try a different search term."
                : "Create your first tour to get started with WAYORA."}
            </p>
            {!search && (
              <Link
                href="/admin/dashboard/tours/create"
                className="mt-6 inline-flex rounded-xl bg-[#087f6e] px-5 py-3 text-sm font-bold text-white hover:bg-[#066354]"
              >
                Create Your First Tour
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTours.map((tour) => {
              const operator =
                typeof tour.operator === "object" && tour.operator
                  ? `${tour.operator.name || ""} ${tour.operator.lastName || ""}`.trim()
                  : "Tour owner";

              return (
                <article
                  key={tour._id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-48 bg-gray-100">
                    {tour.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tour.images[0]}
                        alt={tour.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        🌄
                      </div>
                    )}

                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#087f6e]">
                      {tour.activityType}
                    </span>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-bold text-gray-900">
                        {tour.title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        📍 {tour.destination}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#f5f8f7] p-3">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="mt-1 font-bold text-[#087f6e]">
                          {formatPrice(tour.price, tour.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {tour.duration} {tour.durationUnit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Max participants</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {tour.maxParticipants}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Owner</p>
                        <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                          {operator || "Tour owner"}
                        </p>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm text-gray-600">
                      Meeting point: {tour.meetingPoint}
                    </p>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          window.alert(
                            "Tour ID: " +
                              tour._id +
                              "\n\nEdit and deactivate actions need a protected Admin API, which we will add next."
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View ID
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
