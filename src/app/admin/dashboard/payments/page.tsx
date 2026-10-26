"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Booking = {
  _id: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  participants?: number;
  bookingDate?: string;
  createdAt?: string;
  user?:
    | {
        _id?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
      }
    | string
    | null;
  tour?:
    | {
        _id?: string;
        title?: string;
        destination?: string;
      }
    | string
    | null;
};

function formatCurrency(amount: number | undefined, currency?: string) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount.toLocaleString("en-IN")}`;
  }
}

function statusTone(status?: string) {
  const normalized = (status || "pending").toLowerCase();

  switch (normalized) {
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function AdminPaymentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/admin/bookings", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load bookings.");
        }

        const list = Array.isArray(data.bookings)
          ? data.bookings
          : Array.isArray(data.data)
            ? data.data
            : [];

        setBookings(list);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load payment data."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const user = typeof booking.user === "object" && booking.user ? booking.user : null;
      const tour = typeof booking.tour === "object" && booking.tour ? booking.tour : null;
      const status = (booking.status || "pending").toLowerCase();

      const searchable = [
        booking._id,
        user?.firstName,
        user?.lastName,
        user?.name,
        user?.email,
        tour?.title,
        tour?.destination,
        booking.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchText || searchable.includes(searchText);
      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const summary = useMemo(() => {
    const totalBookings = bookings.length;
    const pending = bookings.filter((b) => (b.status || "pending").toLowerCase() === "pending").length;
    const confirmed = bookings.filter((b) => ["confirmed", "completed"].includes((b.status || "pending").toLowerCase())).length;
    const grossValue = bookings.reduce((sum, booking) => {
      if (typeof booking.totalAmount !== "number") return sum;
      return sum + booking.totalAmount;
    }, 0);

    return { totalBookings, pending, confirmed, grossValue };
  }, [bookings]);

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Payment Reports</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review booking values and payment-related booking statuses.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Recorded bookings</p>
            <p className="text-2xl font-bold text-[#087f6e]">{summary.totalBookings}</p>
          </div>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total bookings</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalBookings}</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending status</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{summary.pending}</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Recorded gross value</p>
            <p className="mt-2 text-3xl font-bold text-[#087f6e]">
              {formatCurrency(summary.grossValue, "INR")}
            </p>
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, tour or booking ID..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All payment statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading payment report...</p>
          ) : filteredBookings.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No bookings match the selected filters.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-4">Booking</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Tour</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => {
                    const user = typeof booking.user === "object" && booking.user ? booking.user : null;
                    const tour = typeof booking.tour === "object" && booking.tour ? booking.tour : null;
                    const dateValue = booking.bookingDate || booking.createdAt || "";
                    const date = dateValue ? new Date(dateValue) : null;
                    const status = booking.status || "pending";

                    return (
                      <tr key={booking._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-mono text-xs">
                          {booking._id.slice(-8)}
                        </td>

                        <td className="px-4 py-5">
                          <p className="font-semibold">
                            {user?.name || user?.firstName || "Unknown customer"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {user?.email || "No email on record"}
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          <p className="font-medium">
                            {tour?.title || "Tour record unavailable"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {tour?.destination || "Location unavailable"}
                          </p>
                        </td>

                        <td className="px-4 py-5 font-semibold">
                          {formatCurrency(booking.totalAmount, booking.currency || "INR")}
                        </td>

                        <td className="px-4 py-5">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(status)}`}>
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-5 text-gray-600">
                          {date && !Number.isNaN(date.getTime())
                            ? date.toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
