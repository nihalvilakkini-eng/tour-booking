
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  Users,
  CreditCard,
  Eye,
} from "lucide-react";

type Booking = {
  _id: string;
  bookingDate?: string;
  startTime?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  paymentStatus?: string;
  rejectionReason?: string;
  createdAt?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  tour?: {
    title?: string;
    destination?: string;
    price?: number;
    currency?: string;
  };
  availability?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    totalSeats?: number;
    availableSeats?: number;
  };
};

type FilterStatus = "all" | Booking["status"];

function getBookings(result: any): Booking[] {
  if (Array.isArray(result?.bookings)) return result.bookings;
  if (Array.isArray(result?.data?.bookings)) return result.data.bookings;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

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

function customerName(booking: Booking) {
  const name = [
    booking.user?.firstName,
    booking.user?.lastName,
  ].filter(Boolean).join(" ");

  return name || booking.user?.email || "Customer";
}

function statusStyle(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function OperatorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const [actionLoading, setActionLoading] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operator/bookings", {
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load bookings.");
      }

      setBookings(getBookings(result));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const updateBooking = async (
    booking: Booking,
    status: "confirmed" | "rejected" | "completed",
    reason = ""
  ) => {
    setActionLoading(booking._id);
    setError("");

    try {
      const response = await fetch("/api/operator/bookings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: booking._id,
          status,
          ...(status === "rejected"
            ? { rejectionReason: reason }
            : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update booking.");
      }

      setRejectingBooking(null);
      setRejectionReason("");
      setSelectedBooking(null);

      await loadBookings();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update booking."
      );
    } finally {
      setActionLoading("");
    }
  };

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    rejected: bookings.filter((b) => b.status === "rejected").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.toLowerCase().trim();

    return bookings.filter((booking) => {
      const matchesStatus =
        filter === "all" || booking.status === filter;

      const searchable = [
        booking._id,
        customerName(booking),
        booking.user?.email,
        booking.tour?.title,
        booking.tour?.destination,
        booking.status,
      ].filter(Boolean).join(" ").toLowerCase();

      return matchesStatus && searchable.includes(query);
    });
  }, [bookings, filter, search]);

  const filters: FilterStatus[] = [
    "all",
    "pending",
    "confirmed",
    "rejected",
    "completed",
    "cancelled",
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            WAYORA PARTNER
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Booking Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage customer reservations and booking requests.
          </p>
        </div>

        <button
          onClick={() => void loadBookings()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Bookings", value: counts.all, icon: CalendarDays },
          { label: "Pending Requests", value: counts.pending, icon: Clock },
          { label: "Confirmed", value: counts.confirmed, icon: CheckCircle },
          { label: "Completed", value: counts.completed, icon: Users },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.label}</p>
                <Icon size={20} className="text-teal-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters and search */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="space-y-4 border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                Customer Reservations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredBookings.length} booking(s) found
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings..."
                className="w-48 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                  filter === status
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status} ({status === "all" ? counts.all : bookings.filter(
                  (b) => b.status === status
                ).length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-semibold text-slate-800">
              No bookings found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Customer reservations will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {booking.tour?.title || "Tour"}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {booking.tour?.destination || "Destination not available"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                      <span>
                        <Users size={15} className="mr-1 inline" />
                        {customerName(booking)}
                      </span>
                      <span>
                        <CalendarDays size={15} className="mr-1 inline" />
                        {formatDate(booking.bookingDate || booking.availability?.date)}
                      </span>
                      <span>
                        {booking.participants ?? "—"} guest(s)
                      </span>
                      <span>
                        {booking.startTime || booking.availability?.startTime || "Time not set"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Booking ID: {booking._id}
                    </p>

                    {booking.status === "rejected" && booking.rejectionReason && (
                      <p className="mt-2 text-sm text-rose-600">
                        Rejection reason: {booking.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <div className="text-left lg:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {booking.currency || booking.tour?.currency || "INR"}{" "}
                        {Number(booking.totalAmount ?? 0).toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Payment: {booking.paymentStatus || "unpaid"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        <Eye size={14} /> Details
                      </button>

                      {booking.status === "pending" && (
                        <>
                          <button
                            disabled={actionLoading === booking._id}
                            onClick={() => void updateBooking(booking, "confirmed")}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Confirm
                          </button>

                          <button
                            disabled={actionLoading === booking._id}
                            onClick={() => setRejectingBooking(booking)}
                            className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {booking.status === "confirmed" && (
                        <button
                          disabled={actionLoading === booking._id}
                          onClick={() => {
                            if (window.confirm("Mark this booking as completed?")) {
                              void updateBooking(booking, "completed");
                            }
                          }}
                          className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking details modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Booking Details
              </h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <Detail label="Tour" value={selectedBooking.tour?.title} />
              <Detail label="Destination" value={selectedBooking.tour?.destination} />
              <Detail label="Customer" value={customerName(selectedBooking)} />
              <Detail label="Email" value={selectedBooking.user?.email} />
              <Detail label="Phone" value={selectedBooking.user?.phone} />
              <Detail label="Booking date" value={formatDate(selectedBooking.bookingDate || selectedBooking.availability?.date)} />
              <Detail label="Start time" value={selectedBooking.startTime || selectedBooking.availability?.startTime} />
              <Detail label="End time" value={selectedBooking.availability?.endTime} />
              <Detail label="Participants" value={String(selectedBooking.participants ?? "—")} />
              <Detail label="Total amount" value={`${selectedBooking.currency || "INR"} ${selectedBooking.totalAmount ?? 0}`} />
              <Detail label="Booking status" value={selectedBooking.status} />
              <Detail label="Payment status" value={selectedBooking.paymentStatus || "unpaid"} />
              <Detail label="Rejection reason" value={selectedBooking.rejectionReason} />
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reject booking modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">
              Reject Booking
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter a reason for rejecting this booking. The customer will be notified.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setRejectingBooking(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                disabled={!rejectionReason.trim() || actionLoading === rejectingBooking._id}
                onClick={() => void updateBooking(
                  rejectingBooking,
                  "rejected",
                  rejectionReason.trim()
                )}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionLoading === rejectingBooking._id ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] break-words text-right font-medium text-slate-900">
        {value || "—"}
      </span>
    </div>
  );
}

type ResourceRow = Record<string, unknown>;

type ResourceProps = {
  title: string;
  description: string;
  endpoint: string;
  fields: { key: string; label: string }[];
};

function displayResourceValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(displayResourceValue).join(", ");
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return String(item.name ?? item.title ?? item.email ?? item._id ?? "—");
  }
  return String(value);
}

function extractResourceRows(result: Record<string, unknown>): ResourceRow[] {
  const data = result.data ?? result;

  if (Array.isArray(data)) return data as ResourceRow[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  for (const key of [
    "items",
    "tours",
    "bookings",
    "availability",
    "reviews",
    "notifications",
    "results",
  ]) {
    if (Array.isArray(record[key])) return record[key] as ResourceRow[];
  }

  return [];
}

export default function OperatorResourcePage({
  title,
  description,
  endpoint,
  fields,
}: ResourceProps) {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? `Request failed: ${response.status}`);
      }

      setRows(extractResourceRows(result));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load records."
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((row) =>
    fields.some(({ key }) =>
      displayResourceValue(row[key]).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">{title} list</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${filtered.length} record(s)`}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full bg-transparent text-sm outline-none sm:w-56"
            />
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Loading records...
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-800">No records found</p>
            <p className="mt-2 text-sm text-slate-500">
              Records will appear when the API returns matching data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {fields.map((field) => (
                    <th key={field.key} className="px-5 py-4 font-semibold">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, index) => (
                  <tr
                    key={String(row._id ?? row.id ?? index)}
                    className="hover:bg-slate-50"
                  >
                    {fields.map((field) => (
                      <td key={field.key} className="max-w-xs px-5 py-4">
                        {displayResourceValue(row[field.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
