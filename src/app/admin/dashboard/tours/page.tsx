"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TourImage from "@/components/tours/TourImage";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tours?all=true", {
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
    const timeout = window.setTimeout(() => {
      void loadTours();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTours]);

  const handleDelete = async (tour: Tour) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${tour.title}"?`
    );

    if (!confirmed) return;

    setDeletingId(tour._id);
    setError("");

    try {
      const response = await fetch(`/api/tours/${tour._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete tour.");
      }

      setTours((previousTours) =>
        previousTours.map((item) =>
          item._id === tour._id ? { ...item, isActive: false } : item
        )
      );

      window.alert("Tour deactivated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete tour."
      );
    } finally {
      setDeletingId(null);
    }
  };

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
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 sm:px-6 lg:px-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/dashboard"
          className="mb-6 inline-flex text-sm font-semibold text-teal-400 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-teal-400">
              WAYORA Admin
            </p>

            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Manage Tours
            </h1>

            <p className="mt-2 text-slate-400">
              View and manage tours available on your platform.
            </p>
          </div>

          <Link
            href="/admin/dashboard/tours/create"
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-500"
          >
            + Create New Tour
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-400">
              Active Tours Returned
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "—" : tours.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-400">
              Search Results
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {loading ? "—" : filteredTours.length}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <label
            htmlFor="tour-search"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Search tours
          </label>

          <input
            id="tour-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, destination or activity..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-950"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-300"
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400 shadow-sm">
            Loading tours...
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-teal-900 bg-teal-950 text-2xl">
              🧭
            </div>

            <h2 className="text-xl font-bold text-white">
              {search ? "No matching tours found" : "No tours available yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {search
                ? "Try a different search term."
                : "Create your first tour to get started with WAYORA."}
            </p>

            {!search && (
              <Link
                href="/admin/dashboard/tours/create"
                className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-500"
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
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-48 bg-slate-800">
                    <TourImage
                      images={tour.images}
                      alt={tour.title}
                      className="object-cover"
                    />

                    <span className="absolute left-3 top-3 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-1 text-xs font-bold text-teal-300">
                      {tour.activityType}
                    </span>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-bold text-white">
                        {tour.title}
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        📍 {tour.destination}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                      <div>
                        <p className="text-xs text-slate-400">Price</p>
                        <p className="mt-1 font-bold text-teal-400">
                          {formatPrice(tour.price, tour.currency)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Duration</p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">
                          {tour.duration} {tour.durationUnit}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Max participants
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">
                          {tour.maxParticipants}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Owner</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                          {operator || "Tour owner"}
                        </p>
                      </div>
                    </div>

                    <p className="line-clamp-2 text-sm text-slate-300">
                      Meeting point: {tour.meetingPoint}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tour.isActive === false ? "border border-slate-700 bg-slate-800 text-slate-300" : "border border-emerald-800 bg-emerald-950 text-emerald-300"}`}>
                        {tour.isActive === false ? "Inactive" : "Active"}
                      </span>
                      <Link
                        href={`/admin/dashboard/tours/${tour._id}/edit`}
                        className="rounded-lg border border-teal-800 bg-teal-950/40 px-4 py-2 text-sm font-semibold text-teal-300 transition hover:bg-teal-900/50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === tour._id || tour.isActive === false}
                        onClick={() => void handleDelete(tour)}
                        className="rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-900/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === tour._id
                          ? "Deactivating..."
                          : tour.isActive === false
                            ? "Inactive"
                            : "Deactivate"}
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