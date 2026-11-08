"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Star } from "lucide-react";

type Review = {
  _id: string;
  customerName?: string;
  customerEmail?: string;
  tourName?: string;
  tourDestination?: string;
  tourImages?: string[];
  rating?: number;
  comment?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Rating({ value }: { value?: number }) {
  const rating = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={16}
          className={index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function OperatorReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operator/reviews", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load reviews.");
      }

      setReviews(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reviews;

    return reviews.filter((review) =>
      [review.customerName, review.customerEmail, review.tourName, review.tourDestination, review.comment]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [reviews, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Customer Reviews</h1>
          <p className="mt-2 text-sm text-slate-500">
            Read ratings and feedback for tours created by your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Reviews</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${filtered.length} review(s) found`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or tour..."
              className="w-full bg-transparent text-sm outline-none sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-semibold text-slate-800">No reviews found</p>
            <p className="mt-1 text-sm text-slate-500">
              Customer reviews for your tours will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((review) => (
              <article key={review._id} className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-slate-900">
                        {review.customerName || "Customer"}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {review.tourName || "Tour"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {review.tourDestination || "Destination not available"}
                      {review.customerEmail ? ` · ${review.customerEmail}` : ""}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {review.comment || "No review comment provided."}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <Rating value={review.rating} />
                    <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
