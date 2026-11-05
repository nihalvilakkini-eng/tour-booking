
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Booking {
  _id: string;
  bookingDate?: string;
  startTime?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  reviewSubmitted?: boolean;
  reviewEligible?: boolean;
  tour?: {
    title?: string;
    destination?: string;
    image?: string;
    price?: number;
  };
  availability?: {
    date?: string;
    startTime?: string;
  };
}

export default function MyBookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch("/api/bookings", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401) {
          router.push("/login?redirect=/bookings");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load bookings.");
        }

        setBookings(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [router]);

  if (loading) {
    return <main className="px-5 py-20 text-center">Loading bookings...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-extrabold text-gray-900">
          My Bookings
        </h1>
        <p className="mt-2 text-gray-600">
          View and manage your tour booking requests.
        </p>

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!error && bookings.length === 0 && (
          <div className="mt-8 rounded-2xl border bg-white p-10 text-center">
            <h2 className="text-xl font-bold">No bookings yet</h2>
            <p className="mt-2 text-gray-600">
              Your booked tours will appear here.
            </p>
            <Link
              href="/tours"
              className="mt-5 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
            >
              Explore Tours
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-5">
          {bookings.map((booking) => {
            const date =
              booking.availability?.date || booking.bookingDate;

            const formattedDate = date
              ? new Date(date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "Not specified";

            return (
              <article
                key={booking._id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {booking.tour?.title || "Tour Experience"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {booking.tour?.destination || "Destination"}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold capitalize text-amber-800">
                    {booking.status || "pending"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-gray-500">Travel date</p>
                    <p className="mt-1 font-semibold">{formattedDate}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Start time</p>
                    <p className="mt-1 font-semibold">
                      {booking.availability?.startTime ||
                        booking.startTime ||
                        "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Participants</p>
                    <p className="mt-1 font-semibold">
                      {booking.participants || 1}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                  <p className="text-lg font-bold text-emerald-700">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: booking.currency || "INR",
                      maximumFractionDigits: 0,
                    }).format(booking.totalAmount || 0)}
                  </p>

                  <Link
                    href={`/bookings/${booking._id}`}
                    className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
                  >
                    View Details
                  </Link>
                  {booking.reviewSubmitted ? (
                    <span className="rounded-xl bg-emerald-50 px-5 py-3 font-semibold text-emerald-800">
                      Review Submitted
                    </span>
                  ) : booking.reviewEligible ? (
                    <Link
                      href={`/reviews?bookingId=${booking._id}`}
                      className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Write a Review
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
