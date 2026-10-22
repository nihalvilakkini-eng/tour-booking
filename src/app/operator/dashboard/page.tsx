"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <main className="flex min-h-[70vh] items-center justify-center bg-[#F7FAF8] px-5">
        <p className="text-lg font-medium text-emerald-800">
          Loading operator dashboard...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAF8] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              WAYORA Operator
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your tours, availability, and customer bookings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/operator/tours/add"
              className="rounded-xl bg-emerald-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-emerald-800"
            >
              + Add Tour
            </Link>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-xl border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="ml-3 font-semibold underline"
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
              <h2 className="text-2xl font-bold text-gray-900">My Tours</h2>
              <p className="mt-1 text-sm text-gray-600">
                Your active tours and their details.
              </p>
            </div>

            <Link
              href="/operator/tours/add"
              className="font-semibold text-emerald-800 hover:underline"
            >
              Create a new tour →
            </Link>
          </div>

          {tours.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <p className="text-4xl">🧭</p>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                No tours yet
              </h3>
              <p className="mt-2 text-gray-600">
                Create your first tour to start receiving booking requests.
              </p>
              <Link
                href="/operator/tours/add"
                className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
              >
                Add your first tour
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tours.map((tour) => (
                <article
                  key={tour._id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-36 items-center justify-center bg-emerald-50 text-5xl">
                    🏞️
                  </div>

                  <div className="p-5">
                    <p className="text-sm font-medium text-emerald-700">
                      {tour.activityType || "Tour activity"}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-gray-900">
                      {tour.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-600">
                      📍 {tour.destination}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      ⏱ {tour.duration} {tour.durationUnit}
                    </p>

                    <p className="mt-4 text-lg font-bold text-emerald-800">
                      {formatPrice(tour.price, tour.currency || "INR")}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        / person
                      </span>
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={`/tours/${tour._id}`}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View Tour
                      </Link>

                      <Link
                        href={`/operator/dashboard/availability?tourId=${encodeURIComponent(tour._id)}`}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      >
                        Manage Availability
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
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Booking Requests
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Review requests made for your tours.
              </p>
            </div>

            <Link
              href="/operator/dashboard/bookings"
              className="font-semibold text-emerald-800 hover:underline"
            >
              View all bookings →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-600 shadow-sm">
              No booking requests found for your tours yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-emerald-50 text-sm text-gray-700">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Tour</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">People</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {bookings.slice(0, 8).map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {[booking.user?.name, booking.user?.lastName]
                            .filter(Boolean)
                            .join(" ") || "Customer"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.user?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {booking.tour?.title || "Tour"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.tour?.destination || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(
                          booking.availability?.date || booking.bookingDate
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.availability?.startTime ||
                            booking.startTime ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {booking.participants}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {formatPrice(
                          booking.totalAmount,
                          booking.currency || "INR"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
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
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-500">{description}</p>
    </div>
  );
}