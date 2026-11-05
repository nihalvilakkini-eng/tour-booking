"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, MapPin, Star } from "lucide-react";
import { isBookingCompleted } from "@/lib/booking-status";

type BookingDetails = {
  _id: string;
  status: string;
  tour?: {
    title?: string;
    destination?: string;
  } | null;
};

function ReviewsForm() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const submissionLock = useRef(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviewDetails() {
      if (!bookingId) {
        setError("Choose a booking from My Bookings to write a review.");
        setLoading(false);
        return;
      }

      try {
        const profileResponse = await fetch("/api/auth/profile", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (profileResponse.status === 401) {
          setAuthRequired(true);
          return;
        }

        const profileResult = await profileResponse.json();
        if (!profileResponse.ok || !profileResult.success) {
          throw new Error(profileResult.message || "Unable to validate your login.");
        }

        if (profileResult.data?.role !== "user") {
          throw new Error("Only customers can write reviews.");
        }

        const bookingResponse = await fetch(
          `/api/bookings/${encodeURIComponent(bookingId)}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const bookingResult = await bookingResponse.json();

        if (bookingResponse.status === 401) {
          setAuthRequired(true);
          return;
        }
        if (!bookingResponse.ok || !bookingResult.success) {
          throw new Error(bookingResult.message || "Unable to load this booking.");
        }

        setBooking(bookingResult.data as BookingDetails);

        const reviewResponse = await fetch(
          `/api/reviews?bookingId=${encodeURIComponent(bookingId)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const reviewResult = await reviewResponse.json();

        if (!reviewResponse.ok || !reviewResult.success) {
          throw new Error(reviewResult.message || "Unable to check review status.");
        }

        setReviewSubmitted(
          Array.isArray(reviewResult.data) && reviewResult.data.length > 0
        );
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this booking."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadReviewDetails();
    return () => controller.abort();
  }, [bookingId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current || submitting || reviewSubmitted) return;

    setError("");
    if (!bookingId) {
      setError("A booking is required to submit a review.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Please choose a rating from 1 to 5 stars.");
      return;
    }
    if (!comment.trim()) {
      setError("Please add a few words about your experience.");
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      const result = await response.json();

      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Your review could not be submitted.");
      }

      setReviewSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your review could not be submitted."
      );
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  const displayedRating = hoveredRating || rating;

  if (loading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading your booking...
          </p>
        </div>
      </main>
    );
  }

  if (authRequired) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#f7faf8] px-5 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to continue</h1>
          <p className="mt-3 text-slate-600">
            Please log in to view your booking and share your experience.
          </p>
          <Link
            href={`/login?redirect=${encodeURIComponent(`/reviews?bookingId=${bookingId}`)}`}
            className="mt-7 inline-flex rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            Log in
          </Link>
        </section>
      </main>
    );
  }

  const eligible = isBookingCompleted(booking?.status);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to My Bookings
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(16,54,40,0.08)]">
          <div className="h-2 bg-gradient-to-r from-emerald-700 via-emerald-500 to-amber-400" />
          <div className="p-6 sm:p-10">
            {booking?.tour && (
              <div className="mb-8 rounded-2xl bg-emerald-50/80 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Your recent experience
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {booking.tour.title || "Tour Experience"}
                </h1>
                {booking.tour.destination && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={16} className="text-emerald-700" aria-hidden="true" />
                    {booking.tour.destination}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {reviewSubmitted ? (
              <div className="py-3 text-center">
                <CheckCircle2
                  size={48}
                  className="mx-auto text-emerald-600"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  Thank you for sharing!
                </h2>
                <p className="mt-2 text-slate-600">
                  Your review has been submitted. It helps other travellers plan
                  their next adventure.
                </p>
                <Link
                  href="/bookings"
                  className="mt-7 inline-flex rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800"
                >
                  Return to My Bookings
                </Link>
              </div>
            ) : !booking ? (
              <div className="py-4 text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  Booking unavailable
                </h2>
                <p className="mt-2 text-slate-600">
                  {error || "We could not find this booking."}
                </p>
              </div>
            ) : !eligible ? (
              <div className="py-4 text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  Your review is almost ready
                </h2>
                <p className="mt-2 text-slate-600">
                  You can leave a review once your tour has been marked
                  completed.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Help fellow travellers
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    How was your experience?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your honest feedback helps other guests choose an
                    experience that is right for them.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-7">
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-800">
                      Your rating
                    </legend>
                    <div
                      className="mt-3 flex items-center gap-2"
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      {Array.from({ length: 5 }, (_, index) => {
                        const value = index + 1;
                        const active = value <= displayedRating;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            onMouseEnter={() => setHoveredRating(value)}
                            aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                            aria-pressed={rating === value}
                            className="rounded-lg p-1 text-amber-500 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          >
                            <Star
                              size={34}
                              fill={active ? "currentColor" : "none"}
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-sm text-slate-500">
                        {rating ? `${rating} out of 5` : "Select a rating"}
                      </span>
                    </div>
                  </fieldset>

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor="review-comment"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Tell us about it
                      </label>
                      <span className="text-xs text-slate-500">
                        {comment.length}/1000
                      </span>
                    </div>
                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      maxLength={1000}
                      rows={6}
                      placeholder="What did you enjoy? What should other travellers know?"
                      className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-6 py-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {submitting ? "Submitting your review..." : "Submit Review"}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[65vh] items-center justify-center px-5">
          <p className="text-sm font-medium text-slate-600">Loading review form...</p>
        </main>
      }
    >
      <ReviewsForm />
    </Suspense>
  );
}
