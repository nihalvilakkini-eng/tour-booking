"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Pencil, RefreshCw, Search } from "lucide-react";
import TourImage from "@/components/tours/TourImage";

type Tour = {
  _id: string;
  title: string;
  description?: string;
  destination?: string;
  activityType?: string;
  price?: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  maxParticipants?: number;
  images?: string[];
  isActive?: boolean;
};

function formatPrice(tour: Tour) {
  const currency = tour.currency || "INR";
  const price = Number(tour.price ?? 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString("en-IN")}`;
  }
}

export default function OperatorToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadTours = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operator/tours", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load your tours.");
      }

      setTours(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your tours.");
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

  const filteredTours = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tours;

    return tours.filter((tour) =>
      [tour.title, tour.description, tour.destination, tour.activityType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [tours, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">My Tours</h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage the tour experiences created by your operator account.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadTours()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <Link
            href="/operator/tour/add"
            className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Add Tour
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Your tour listings</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${filteredTours.length} tour(s) found`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tours..."
              className="w-full bg-transparent text-sm outline-none sm:w-64"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200">
              <div className="h-52 bg-slate-200" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
                <div className="h-10 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTours.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="font-semibold text-slate-800">
            {search ? "No matching tours" : "No tours yet"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {search
              ? "Try a different search term."
              : "Create your first tour to start receiving bookings."}
          </p>
          {!search && (
            <Link
              href="/operator/tour/add"
              className="mt-5 inline-flex rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Create Your First Tour
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTours.map((tour) => (
            <article
              key={tour._id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-52 overflow-hidden bg-slate-100">
                <TourImage
                  images={tour.images}
                  alt={tour.title}
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                {tour.activityType && (
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-teal-700 shadow-sm">
                    {tour.activityType}
                  </span>
                )}
              </div>

              <div className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                      {tour.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">
                        {tour.destination || "Destination not specified"}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {tour.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    {tour.duration ?? "—"} {tour.durationUnit || "hours"}
                  </span>
                  {tour.maxParticipants != null && (
                    <span className="rounded-lg bg-slate-100 px-3 py-2">
                      Up to {tour.maxParticipants} guests
                    </span>
                  )}
                  <span
                    className={`rounded-lg px-3 py-2 ${
                      tour.isActive === false
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {tour.isActive === false ? "Inactive" : "Active"}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="mt-1 text-lg font-bold text-teal-700">
                      {formatPrice(tour)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/operator/dashboard/tours/${tour._id}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/operator/tours/${tour._id}/edit`}
                      className="flex items-center gap-2 rounded-xl border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      <Pencil size={15} /> Edit Tour
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
