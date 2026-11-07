"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Booking = {
  _id: string;
  status?: string;
  participants?: number;
  guests?: number;
  totalPrice?: number;
  totalAmount?: number;
  createdAt?: string;
  date?: string;
  bookingDate?: string;
  user?: { name?: string; email?: string } | string;
  tour?: { title?: string; name?: string; destination?: string } | string;
};

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch("/api/admin/bookings", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load bookings.");
        }

        const list = data.bookings ?? data.data ?? data;
        setBookings(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load bookings.");
      } finally {
        setLoading(false);
      }
    }

    void loadBookings();
  }, []);

  const filtered = bookings.filter((booking) => {
    const user = typeof booking.user === "object" ? booking.user : null;
    const tour = typeof booking.tour === "object" ? booking.tour : null;
    const searchable = [
      booking._id,
      user?.name,
      user?.email,
      tour?.title,
      tour?.name,
      tour?.destination,
      booking.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesStatus =
      status === "all" || (booking.status || "pending").toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
            WAYORA Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold">Bookings Management</h1>
          <p className="mt-2 text-sm text-gray-500">
            Monitor bookings and their current statuses.
          </p>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking, customer or tour..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Showing {filtered.length} of {bookings.length} bookings
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading bookings...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No bookings found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-4 py-4">Booking ID</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Tour</th>
                    <th className="px-4 py-4">Participants</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((booking) => {
                    const user =
                      typeof booking.user === "object" ? booking.user : null;
                    const tour =
                      typeof booking.tour === "object" ? booking.tour : null;
                    const amount = booking.totalPrice ?? booking.totalAmount;
                    const date = booking.date ?? booking.bookingDate ?? booking.createdAt;

                    return (
                      <tr key={booking._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-mono text-xs">
                          {booking._id.slice(-8)}
                        </td>
                        <td className="px-4 py-5">
                          <p className="font-semibold">
                            {user?.name ||
                              (typeof booking.user === "string" ? booking.user : "—")}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{user?.email || ""}</p>
                        </td>
                        <td className="px-4 py-5">
                          {tour?.title || tour?.name ||
                            (typeof booking.tour === "string" ? booking.tour : "—")}
                        </td>
                        <td className="px-4 py-5">
                          {booking.participants ?? booking.guests ?? "—"}
                        </td>
                        <td className="px-4 py-5 font-semibold">
                          {typeof amount === "number"
                            ? `₹${amount.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-gray-600">
                          {date && !Number.isNaN(new Date(date).getTime())
                            ? new Date(date).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              booking.status || "pending"
                            )}`}
                          >
                            {booking.status || "Pending"}
                          </span>
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