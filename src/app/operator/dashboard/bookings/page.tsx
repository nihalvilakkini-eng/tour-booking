"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  Eye,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import TourImage from "@/components/tours/TourImage";

type BookingStatus =
  | "pending"
  | "accepted"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

type Booking = {
  _id: string;
  createdAt?: string;
  bookingDate?: string;
  startTime?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status: BookingStatus;
  paymentStatus?: string;
  paidAt?: string | null;
  rejectionReason?: string;
  specialRequirements?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  user?: {
    name?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  tour?: {
    title?: string;
    destination?: string;
    images?: string[];
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

type Tab = "pending" | "accepted" | "paid" | "other";

function isPaid(booking: Booking) {
  return (booking.paymentStatus || "").toLowerCase() === "paid";
}

function isAccepted(booking: Booking) {
  return (
    (booking.status === "accepted" || booking.status === "confirmed") &&
    !isPaid(booking)
  );
}

function isPending(booking: Booking) {
  return booking.status === "pending";
}

function isOther(booking: Booking) {
  return (
    !isPending(booking) &&
    !isAccepted(booking) &&
    !isPaid(booking)
  );
}

function customerName(booking: Booking) {
  return (
    booking.customerName ||
    [booking.user?.name, booking.user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    booking.user?.email ||
    "Customer"
  );
}

function customerEmail(booking: Booking) {
  return booking.customerEmail || booking.user?.email || "—";
}

function customerPhone(booking: Booking) {
  return booking.customerPhone || booking.user?.phone || "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(booking: Booking) {
  const currency = booking.currency || booking.tour?.currency || "INR";
  return `${currency} ${Number(booking.totalAmount ?? 0).toLocaleString("en-IN")}`;
}

function statusLabel(booking: Booking) {
  if (isPaid(booking)) return "Payment completed";
  if (booking.status === "accepted" || booking.status === "confirmed") return "Accepted";
  return booking.status;
}

function statusClass(booking: Booking) {
  if (isPaid(booking)) return "bg-emerald-100 text-emerald-800";
  if (booking.status === "accepted" || booking.status === "confirmed") return "bg-blue-100 text-blue-800";
  if (booking.status === "pending") return "bg-amber-100 text-amber-800";
  if (booking.status === "rejected") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function paymentClass(booking: Booking) {
  const status = (booking.paymentStatus || "unpaid").toLowerCase();
  if (status === "paid") return "bg-emerald-100 text-emerald-800";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "failed" || status === "refunded") {
    return "bg-rose-100 text-rose-800";
  }
  return "bg-slate-100 text-slate-700";
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function OperatorBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [actionLoading, setActionLoading] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operator/bookings", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load bookings.");
      }

      const data = Array.isArray(result.data) ? result.data : [];
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadBookings]);

  const updateBooking = async (
    booking: Booking,
    status: "accepted" | "rejected",
    reason = ""
  ) => {
    setActionLoading(booking._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/operator/bookings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking._id,
          status,
          ...(status === "rejected" ? { rejectionReason: reason } : {}),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update booking.");
      }

      setSuccess(
        status === "accepted"
          ? "Booking accepted successfully."
          : "Booking rejected successfully."
      );
      setRejectingBooking(null);
      setRejectionReason("");
      setSelectedBooking(null);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update booking.");
    } finally {
      setActionLoading("");
    }
  };

  const counts = useMemo(
    () => ({
      pending: bookings.filter(isPending).length,
      accepted: bookings.filter(isAccepted).length,
      paid: bookings.filter(isPaid).length,
      other: bookings.filter(isOther).length,
    }),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesTab =
        tab === "pending"
          ? isPending(booking)
          : tab === "accepted"
            ? isAccepted(booking)
            : tab === "paid"
              ? isPaid(booking)
              : isOther(booking);

      if (!matchesTab) return false;
      if (!query) return true;

      return [
        customerName(booking),
        customerEmail(booking),
        customerPhone(booking),
        booking.tour?.title,
        booking.tour?.destination,
        booking._id,
        booking.status,
        booking.paymentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [bookings, search, tab]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "accepted", label: "Accepted", count: counts.accepted },
    { key: "paid", label: "Payment Completed", count: counts.paid },
    { key: "other", label: "Other", count: counts.other },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Booking Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review booking requests, accept reservations, and track payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBookings()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {(error || success) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-2xl border p-5 text-left transition ${
              tab === item.key
                ? "border-teal-600 bg-teal-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {item.count}
            </p>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="space-y-4 border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                {tabs.find((item) => item.key === tab)?.label} bookings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading..."
                  : `${filteredBookings.length} booking(s) found`}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, tour, email..."
                className="w-full bg-transparent text-sm outline-none sm:w-64"
              />
            </div>
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
              No bookings in this section
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Bookings will appear here when customers reserve your tours.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 p-5 xl:grid-cols-2">
            {filteredBookings.map((booking) => (
              <article
                key={booking._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="relative h-44 w-full shrink-0 sm:h-auto sm:w-44">
                    <TourImage
                      images={booking.tour?.images}
                      alt={booking.tour?.title || "Tour"}
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-bold text-slate-900">
                          {booking.tour?.title || "Tour"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {booking.tour?.destination || "Destination not available"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(booking)}`}
                        >
                          {statusLabel(booking)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentClass(booking)}`}
                        >
                          {booking.paymentStatus || "unpaid"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Field label="Customer" value={customerName(booking)} />
                      <Field label="Email" value={customerEmail(booking)} />
                      <Field label="Phone" value={customerPhone(booking)} />
                      <Field label="Booking date" value={formatDate(booking.createdAt)} />
                      <Field
                        label="Travel date"
                        value={formatDate(booking.availability?.date || booking.bookingDate)}
                      />
                      <Field label="Travellers" value={booking.participants ?? "—"} />
                      <Field label="Total amount" value={formatAmount(booking)} />
                      <Field label="Start time" value={booking.startTime || booking.availability?.startTime || "—"} />
                    </div>

                    {booking.status === "rejected" && booking.rejectionReason && (
                      <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        Rejection reason: {booking.rejectionReason}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        <Eye size={14} /> Details
                      </button>

                      {isPending(booking) && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading === booking._id}
                            onClick={() => void updateBooking(booking, "accepted")}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            {actionLoading === booking._id ? "Please wait..." : "Accept"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === booking._id}
                            onClick={() => {
                              setRejectionReason("");
                              setRejectingBooking(booking);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="relative mt-5 h-52 overflow-hidden rounded-xl">
              <TourImage
                images={selectedBooking.tour?.images}
                alt={selectedBooking.tour?.title || "Tour"}
                className="object-cover"
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Tour" value={selectedBooking.tour?.title} />
              <Field label="Destination" value={selectedBooking.tour?.destination} />
              <Field label="Customer" value={customerName(selectedBooking)} />
              <Field label="Email" value={customerEmail(selectedBooking)} />
              <Field label="Phone" value={customerPhone(selectedBooking)} />
              <Field label="Booking date" value={formatDate(selectedBooking.createdAt)} />
              <Field label="Travel date" value={formatDate(selectedBooking.availability?.date || selectedBooking.bookingDate)} />
              <Field label="Start time" value={selectedBooking.startTime || selectedBooking.availability?.startTime} />
              <Field label="End time" value={selectedBooking.availability?.endTime} />
              <Field label="Travellers" value={selectedBooking.participants} />
              <Field label="Total amount" value={formatAmount(selectedBooking)} />
              <Field label="Booking status" value={statusLabel(selectedBooking)} />
              <Field label="Payment status" value={selectedBooking.paymentStatus || "unpaid"} />
              <Field label="Paid at" value={formatDate(selectedBooking.paidAt)} />
              <Field label="Special requirements" value={selectedBooking.specialRequirements} />
              <Field label="Rejection reason" value={selectedBooking.rejectionReason} />
            </div>

            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Reject Booking</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter a reason for rejecting this booking. The customer will be notified.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-600"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectingBooking(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || actionLoading === rejectingBooking._id}
                onClick={() =>
                  void updateBooking(rejectingBooking, "rejected", rejectionReason.trim())
                }
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
