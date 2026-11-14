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
          className={index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}
        />
      ))}
      <span className="ml-1 text-sm font-bold text-amber-400">{rating.toFixed(1)}</span>
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
    <div className="space-y-6 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            ✦ WAYORA PARTNER
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Customer Reviews</h1>
          <p className="mt-2 text-sm text-slate-400">
            Read ratings and feedback for tours created by your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#121a22] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121a22] shadow-xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-white">Reviews</h2>
            <p className="mt-1 text-sm text-slate-400">
              {loading ? "Loading..." : `${filtered.length} review(s) found`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0b1116] px-3 py-2.5 focus-within:border-amber-500/50">
            <Search size={17} className="text-amber-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer or tour..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="mx-auto text-slate-600" size={36} />
            <p className="mt-3 font-semibold text-white">No reviews found</p>
            <p className="mt-1 text-sm text-slate-400">
              Customer reviews for your tours will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((review) => (
              <article key={review._id} className="p-5 transition hover:bg-white/[0.02]">
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-white">
                        {review.customerName || "Customer"}
                      </h3>
                      <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-0.5 text-xs font-semibold text-amber-300">
                        {review.tourName || "Tour"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {review.tourDestination || "Destination not available"}
                      {review.customerEmail ? ` · ${review.customerEmail}` : ""}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
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