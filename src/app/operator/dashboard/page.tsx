"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TourImage from "@/components/tours/TourImage";

type Tour = {
  _id: string;
  title: string;
  destination: string;
  activityType: string;
  price: number;
  currency?: string;
  duration: number;
  durationUnit: string;
  images?: string[];
  isActive?: boolean;
};

type Booking = {
  _id: string;
  participants: number;
  totalAmount: number;
  currency?: string;
  status: string;
  createdAt?: string;
  bookingDate?: string;
  startTime?: string;
  user?: {
    name?: string;
    lastName?: string;
    email?: string;
  };
  tour?: {
    _id?: string;
    title?: string;
    destination?: string;
  };
  availability?: {
    date?: string;
    startTime?: string;
  };
};

type Availability = {
  _id: string;
  date: string;
  startTime: string;
  availableSeats: number;
  isAvailable: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
};

export default function OperatorDashboardPage() {
  const router = useRouter();

  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError("");
    }

    try {
      const toursResponse = await fetch("/api/tours?mine=true", {
        cache: "no-store",
      });

      const toursResult: ApiResponse<Tour[]> =
        await toursResponse.json();

      if (toursResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (toursResponse.status === 403) {
        setError("This dashboard is available to operators only.");
        return;
      }

      if (!toursResponse.ok || !toursResult.success) {
        throw new Error(toursResult.message || "Could not load your tours.");
      }

      const operatorTours = Array.isArray(toursResult.data)
        ? toursResult.data
        : [];

      setTours(operatorTours);

      const bookingsResponse = await fetch("/api/bookings", {
        cache: "no-store",
      });

      const bookingsResult: ApiResponse<Booking[]> =
        await bookingsResponse.json();

      if (bookingsResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!bookingsResponse.ok || !bookingsResult.success) {
        throw new Error(
          bookingsResult.message || "Could not load booking requests."
        );
      }

      setBookings(
        Array.isArray(bookingsResult.data) ? bookingsResult.data : []
      );

      // Count availability slots for this operator's tours only.
      const availabilityResults = await Promise.all(
        operatorTours.map(async (tour) => {
          const response = await fetch(
            `/api/availability?tourId=${encodeURIComponent(tour._id)}`,
            { cache: "no-store" }
          );

          if (!response.ok) return [];

          const result: ApiResponse<Availability[]> =
            await response.json();

          return Array.isArray(result.data) ? result.data : [];
        })
      );

      setAvailabilityCount(
        availabilityResults.reduce(
          (total, slots) => total + slots.length,
          0
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const pendingBookings = bookings.filter(
    (booking) => booking.status?.toLowerCase() === "pending"
  );

  const formatDate = (date?: string) => {
    if (!date) return "Date not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date not available";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (amount?: number, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  };

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#0b1116] px-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121a22] px-6 py-4 shadow-xl">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-base font-medium text-slate-200">
            Loading operator dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              ✦ WAYORA OPERATOR
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Manage your tours, availability, and customer bookings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/operator/tour/add"
              className="rounded-xl bg-amber-500 px-5 py-3 text-center text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              + Add Tour
            </Link>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-xl border border-white/15 bg-[#121a22] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="ml-3 font-semibold text-amber-400 underline"
            >
              Try again
            </button>
          </div>
        )}

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My Tours"
            value={tours.length}
            description="Tours created by you"
            icon="🧭"
          />
          <StatCard
            label="Booking Requests"
            value={bookings.length}
            description="Requests for your tours"
            icon="📋"
          />
          <StatCard
            label="Pending Requests"
            value={pendingBookings.length}
            description="Waiting for your response"
            icon="⏳"
          />
          <StatCard
            label="Availability Slots"
            value={availabilityCount}
            description="Available tour time slots"
            icon="📅"
          />
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">My Tours</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your active tours and their details.
              </p>
            </div>

            <Link
              href="/operator/tour/add"
              className="font-semibold text-amber-400 hover:text-amber-300 hover:underline"
            >
              Create a new tour →
            </Link>
          </div>

          {tours.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#121a22] px-6 py-12 text-center">
              <p className="text-4xl">🧭</p>
              <h3 className="mt-4 text-lg font-bold text-white">
                No tours yet
              </h3>
              <p className="mt-2 text-slate-400">
                Create your first tour to start receiving booking requests.
              </p>
              <Link
                href="/operator/tour/add"
                className="mt-5 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
              >
                Add your first tour
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tours.map((tour) => (
                <article
                  key={tour._id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#121a22] shadow-xl transition hover:-translate-y-1 hover:border-amber-500/40"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-[#0b1116]">
                    <TourImage
                      images={tour.images}
                      image={tour.images?.[0]}
                      alt={tour.title}
                      className="object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {tour.activityType || "Tour activity"}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-white">
                      {tour.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">
                      📍 {tour.destination}
                    </p>

                    <p className="mt-1.5 text-sm text-slate-400">
                      ⏱ {tour.duration} {tour.durationUnit}
                    </p>

                    <p className="mt-4 text-lg font-extrabold text-amber-400">
                      {formatPrice(tour.price, tour.currency || "INR")}
                      <span className="text-sm font-normal text-slate-400">
                        {" "}
                        / person
                      </span>
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/tours/${tour._id}`}
                        className="rounded-lg border border-white/15 bg-[#0b1116] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400"
                      >
                        View Tour
                      </Link>

                      <Link
                        href={`/operator/dashboard/availability?tourId=${encodeURIComponent(tour._id)}`}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
                      >
                        Manage Availability
                      </Link>

                      <Link
                        href={`/operator/tours/${tour._id}/edit`}
                        className="rounded-lg border border-sky-500/35 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/25"
                      >
                        Edit Tour
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Recent Booking Requests
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Review requests made for your tours.
              </p>
            </div>

            <Link
              href="/operator/dashboard/bookings"
              className="font-semibold text-amber-400 hover:text-amber-300 hover:underline"
            >
              View all bookings →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#121a22] p-8 text-center text-slate-400 shadow-lg">
              No booking requests found for your tours yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121a22] shadow-xl">
              <table className="w-full min-w-[700px] text-left">
                <thead className="border-b border-white/10 bg-[#0b1116] text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Tour</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">People</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {bookings.slice(0, 8).map((booking) => (
                    <tr key={booking._id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {[booking.user?.name, booking.user?.lastName]
                            .filter(Boolean)
                            .join(" ") || "Customer"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {booking.user?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">
                          {booking.tour?.title || "Tour"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {booking.tour?.destination || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {formatDate(
                          booking.availability?.date || booking.bookingDate
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {booking.availability?.startTime ||
                            booking.startTime ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {booking.participants}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-amber-400">
                        {formatPrice(
                          booking.totalAmount,
                          booking.currency || "INR"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-semibold capitalize text-amber-300">
                          {booking.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-extrabold text-amber-400">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-2xl">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
    </div>
  );
}