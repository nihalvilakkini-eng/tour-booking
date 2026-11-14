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
    case "accepted":
      return "bg-emerald-950 text-emerald-300 border border-emerald-800";
    case "cancelled":
    case "rejected":
      return "bg-rose-950 text-rose-300 border border-rose-800";
    case "pending":
      return "bg-amber-950 text-amber-300 border border-amber-800";
    case "completed":
      return "bg-blue-950 text-blue-300 border border-blue-800";
    default:
      return "bg-slate-800 text-slate-400 border border-slate-700";
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
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-teal-400 hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
            WAYORA Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Bookings Management</h1>
          <p className="mt-2 text-sm text-slate-400">
            Monitor bookings and their current statuses.
          </p>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking, customer or tour..."
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            Showing {filtered.length} of {bookings.length} bookings
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-300">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-slate-400">Loading bookings...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-slate-400">No bookings found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <th className="px-4 py-4">Booking ID</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Tour</th>
                    <th className="px-4 py-4">Participants</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((booking) => {
                    const user =
                      typeof booking.user === "object" ? booking.user : null;
                    const tour =
                      typeof booking.tour === "object" ? booking.tour : null;
                    const amount = booking.totalPrice ?? booking.totalAmount;
                    const date = booking.date ?? booking.bookingDate ?? booking.createdAt;

                    return (
                      <tr key={booking._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-4 py-5 font-mono text-xs text-slate-400">
                          {booking._id.slice(-8)}
                        </td>
                        <td className="px-4 py-5">
                          <p className="font-semibold text-white">
                            {user?.name ||
                              (typeof booking.user === "string" ? booking.user : "—")}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{user?.email || ""}</p>
                        </td>
                        <td className="px-4 py-5 text-slate-200">
                          {tour?.title || tour?.name ||
                            (typeof booking.tour === "string" ? booking.tour : "—")}
                        </td>
                        <td className="px-4 py-5 text-slate-300">
                          {booking.participants ?? booking.guests ?? "—"}
                        </td>
                        <td className="px-4 py-5 font-semibold text-white">
                          {typeof amount === "number"
                            ? `₹${amount.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-slate-400">
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