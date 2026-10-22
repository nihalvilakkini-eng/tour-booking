"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Review = {
  _id: string;
  rating?: number;
  comment?: string;
  review?: string;
  title?: string;
  createdAt?: string;
  user?: { name?: string; email?: string } | string;
  tour?: { title?: string; name?: string } | string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch("/api/admin/reviews", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load reviews.");
        }

        const list = data.reviews ?? data.data ?? data;
        setReviews(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load reviews.");
      } finally {
        setLoading(false);
      }
    }

    void loadReviews();
  }, []);

  const filtered = reviews.filter((review) => {
    const user = typeof review.user === "object" ? review.user : null;
    const tour = typeof review.tour === "object" ? review.tour : null;

    const searchable = [
      user?.name,
      user?.email,
      tour?.title,
      tour?.name,
      review.title,
      review.comment,
      review.review,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      searchable.includes(search.toLowerCase()) &&
      (ratingFilter === "all" || review.rating === Number(ratingFilter))
    );
  });

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Reviews Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review customer feedback across tours.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Total reviews</p>
            <p className="text-2xl font-bold text-[#087f6e]">{reviews.length}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, tour or review..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            />

            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading reviews...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No reviews found.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {filtered.map((review) => {
                const user =
                  typeof review.user === "object" ? review.user : null;
                const tour =
                  typeof review.tour === "object" ? review.tour : null;

                return (
                  <article
                    key={review._id}
                    className="rounded-xl border border-gray-100 p-5 transition hover:border-[#c6e4dd]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold">
                          {tour?.title || tour?.name ||
                            (typeof review.tour === "string" ? review.tour : "Tour review")}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          By {user?.name ||
                            (typeof review.user === "string" ? review.user : "Unknown user")}
                          {user?.email ? ` · ${user.email}` : ""}
                        </p>
                      </div>

                      <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                        {"★".repeat(Math.max(0, Math.min(5, review.rating ?? 0)))}
                        {"☆".repeat(5 - Math.max(0, Math.min(5, review.rating ?? 0)))}
                        <span className="ml-2">{review.rating ?? "—"}/5</span>
                      </div>
                    </div>

                    {review.title && (
                      <h3 className="mt-4 font-semibold">{review.title}</h3>
                    )}

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {review.comment || review.review || "No written feedback."}
                    </p>

                    <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleDateString()
                        : "Date unavailable"}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}