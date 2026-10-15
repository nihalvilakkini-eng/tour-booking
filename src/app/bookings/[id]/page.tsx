"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Booking {
  _id: string;
  bookingDate?: string;
  startTime?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status?: string;
  specialRequirements?: string;
  tour?: {
    _id?: string;
    title?: string;
    destination?: string;
    price?: number;
    currency?: string;
    duration?: string;
    durationUnit?: string;
  };
  availability?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = String(params.id);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        const response = await fetch("/api/bookings", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401) {
          router.push(
            `/login?redirect=${encodeURIComponent(
              `/bookings/${bookingId}`
            )}`
          );
          return;
        }

        if (!response.ok || result?.success !== true) {
          throw new Error(result?.message || "Unable to load bookings.");
        }

        const bookings: Booking[] = Array.isArray(result.data)
          ? result.data
          : [];

        const found = bookings.find(
          (item) => String(item._id) === bookingId
        );

        if (!found) {
          throw new Error("Booking not found.");
        }

        setBooking(found);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, router]);

  if (loading) {
    return (
      <main className="px-5 py-20 text-center text-gray-600">
        Loading your booking...
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Booking details unavailable
        </h1>
        <p className="mt-3 text-red-600">
          {error || "Booking not found."}
        </p>
        <Link
          href="/bookings"
          className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
        >
          My Bookings
        </Link>
      </main>
    );
  }

  const tourTitle = booking.tour?.title || "Tour Experience";
  const destination = booking.tour?.destination || "Destination";
  const date = booking.availability?.date || booking.bookingDate;
  const time = booking.availability?.startTime || booking.startTime;
  const currency =
    booking.currency || booking.tour?.currency || "INR";

  const total = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(booking.totalAmount ?? 0);

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Not specified";

  const status = booking.status || "pending";

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
              ✓
            </div>

            <p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-700">
              Wayora · Booking
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-gray-900">
              Booking request received!
            </h1>

            <p className="mt-3 text-gray-600">
              Your booking request has been created. Check its status below.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">Booking reference</p>
              <p className="mt-1 break-all font-bold text-gray-900">
                {booking._id}
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold capitalize text-amber-800">
              {status}
            </span>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <p className="text-sm text-gray-500">Tour</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {tourTitle}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                📍 {destination}
              </p>
            </div>

            <div className="grid gap-5 border-y border-gray-100 py-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Travel date</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formattedDate}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Start time</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {time || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {booking.participants ?? 1}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Total amount</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {total}
                </p>
              </div>
            </div>

            {booking.specialRequirements && (
              <div>
                <p className="text-sm text-gray-500">
                  Special requirements
                </p>
                <p className="mt-1 text-gray-800">
                  {booking.specialRequirements}
                </p>
              </div>
            )}

            <div className="rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              Your current booking status is{" "}
              <strong className="capitalize">{status}</strong>. The booking
              API creates requests with pending status, so this does not mean
              the operator has confirmed your booking or that payment is complete.
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/bookings"
              className="rounded-xl bg-emerald-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-emerald-800"
            >
              View My Bookings
            </Link>

            <Link
              href="/tours"
              className="rounded-xl border border-gray-300 px-5 py-3 text-center font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Explore More Tours
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}