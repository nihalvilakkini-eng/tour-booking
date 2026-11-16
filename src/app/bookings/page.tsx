"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CancelBookingButton from "@/components/CancelBookingButton";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock4,
  RefreshCw,
  Compass,
  CreditCard,
} from "lucide-react";
import PayNowButton from "@/components/payments/PayNowButton";
import { loadRazorpayScript } from "@/lib/razorpay-client";

interface Booking {
  _id: string;
  bookingDate?: string;
  startTime?: string;
  participants?: number;
  totalAmount?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  paidAt?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequirements?: string;
  rejectionReason?: string;
  reviewSubmitted?: boolean;
  reviewEligible?: boolean;
  createdAt?: string;
  user?: {
    _id?: string;
    name?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  tour?: {
    _id?: string;
    title?: string;
    destination?: string;
    activityType?: string;
    image?: string;
    images?: string[];
    price?: number;
    currency?: string;
  };
  availability?: {
    _id?: string;
    date?: string;
    startTime?: string;
  };
}

export default function MyBookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(
    null
  );

  // Preload Razorpay Checkout script in the background on page load
  useEffect(() => {
    void loadRazorpayScript().catch(() => {});
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("wayora_token") || localStorage.getItem("token")
          : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/bookings?mine=true", {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push("/login?redirect=/bookings");
        return;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to load bookings.");
      }

      setBookings(Array.isArray(result.data) ? result.data : []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBookings, reloadKey]);

  // Listen for global booking updates (e.g. from operator actions or notifications)
  useEffect(() => {
    function handleBookingChange() {
      void loadBookings();
    }

    window.addEventListener("wayora-booking-change", handleBookingChange);
    return () => {
      window.removeEventListener("wayora-booking-change", handleBookingChange);
    };
  }, [loadBookings]);

  function handlePaymentSuccess(bookingId: string) {
    // Optimistically update the booking in state for instant UI feedback
    setBookings((prev) =>
      prev.map((item) =>
        item._id === bookingId
          ? {
              ...item,
              status: "confirmed",
              paymentStatus: "paid",
              paidAt: new Date().toISOString(),
            }
          : item
      )
    );

    // Refresh bookings from server to synchronize fully
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b1116] px-5 py-20 text-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121a22] px-6 py-4 shadow-xl">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
          <span className="font-medium text-slate-200">Loading your bookings...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              ✦ RESERVATIONS &amp; PAYMENTS
            </span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">
              View tour reservations, monitor approval status and complete payments securely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadBookings();
            }}
            className="inline-flex self-start items-center gap-2 rounded-xl border border-white/15 bg-[#121a22] px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-amber-500/40 hover:text-amber-400 sm:self-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-white">Unable to load bookings</p>
              <p className="mt-0.5 text-sm text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {!error && bookings.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-[#121a22] p-8 text-center shadow-2xl sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <Compass className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">
              No bookings yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-400">
              When you book a tour experience, your reservation details and payment status will appear here.
            </p>
            <Link
              href="/tours"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Tours</span>
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {bookings.map((booking) => {
            const dateValue =
              booking.availability?.date || booking.bookingDate;

            const formattedDate = dateValue
              ? new Date(dateValue).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "Not specified";

            const bookingStatus = String(booking.status || "pending").trim().toLowerCase();
            const paymentStatus = String(booking.paymentStatus || "unpaid").trim().toLowerCase();

            const isAcceptedOrConfirmed =
              bookingStatus === "accepted" || bookingStatus === "confirmed";
            const isPending = bookingStatus === "pending";
            const isPaid = paymentStatus === "paid";

            const isPayNowEnabled =
              isAcceptedOrConfirmed &&
              !isPaid &&
              paymentStatus !== "refunded";

            const bookingBadgeConfig: Record<
              string,
              { label: string; bg: string; text: string; border: string }
            > = {
              pending: {
                label: "Pending Approval",
                bg: "bg-amber-500/15",
                text: "text-amber-300",
                border: "border-amber-500/35",
              },
              accepted: {
                label: "Accepted",
                bg: "bg-emerald-500/15",
                text: "text-emerald-300",
                border: "border-emerald-500/35",
              },
              confirmed: {
                label: "Confirmed",
                bg: "bg-emerald-500/15",
                text: "text-emerald-300",
                border: "border-emerald-500/35",
              },
              completed: {
                label: "Completed",
                bg: "bg-emerald-500/15",
                text: "text-emerald-300",
                border: "border-emerald-500/35",
              },
              rejected: {
                label: "Rejected",
                bg: "bg-rose-500/15",
                text: "text-rose-300",
                border: "border-rose-500/35",
              },
              cancelled: {
                label: "Cancelled",
                bg: "bg-slate-500/15",
                text: "text-slate-300",
                border: "border-slate-500/35",
              },
            };

            const currentBookingBadge =
              bookingBadgeConfig[bookingStatus] || {
                label: booking.status || "Pending",
                bg: "bg-white/10",
                text: "text-slate-300",
                border: "border-white/15",
              };

            const paymentBadgeConfig: Record<
              string,
              { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
            > = {
              paid: {
                label: "Paid",
                bg: "bg-emerald-500/20",
                text: "text-emerald-300",
                border: "border-emerald-500/40",
                icon: CheckCircle2,
              },
              pending: {
                label: "Payment Pending",
                bg: "bg-amber-500/20",
                text: "text-amber-300",
                border: "border-amber-500/40",
                icon: Clock4,
              },
              unpaid: {
                label: "Unpaid",
                bg: "bg-white/5",
                text: "text-slate-300",
                border: "border-white/15",
                icon: AlertCircle,
              },
              failed: {
                label: "Payment Failed",
                bg: "bg-rose-500/20",
                text: "text-rose-300",
                border: "border-rose-500/40",
                icon: AlertCircle,
              },
              refunded: {
                label: "Refunded",
                bg: "bg-purple-500/20",
                text: "text-purple-300",
                border: "border-purple-500/40",
                icon: AlertCircle,
              },
            };

            const currentPaymentBadge =
              paymentBadgeConfig[paymentStatus] || {
                label: booking.paymentStatus || "Unpaid",
                bg: "bg-white/5",
                text: "text-slate-300",
                border: "border-white/15",
                icon: AlertCircle,
              };

            const PaymentBadgeIcon = currentPaymentBadge.icon;

            const customerNameDisplay =
              booking.customerName ||
              (booking.user?.name
                ? `${booking.user.name} ${booking.user.lastName || ""}`.trim()
                : "");

            return (
              <article
                key={booking._id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#121a22] p-5 shadow-xl transition hover:border-amber-500/35 sm:p-6"
              >
                {/* Header row */}
                <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-amber-400">
                        REF #{booking._id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                      {booking.tour?.title || "Tour Experience"}
                    </h2>

                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-400">
                      <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>{booking.tour?.destination || "Destination"}</span>
                    </div>
                  </div>

                  {/* Badges container */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${currentBookingBadge.bg} ${currentBookingBadge.text} ${currentBookingBadge.border}`}
                    >
                      {currentBookingBadge.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${currentPaymentBadge.bg} ${currentPaymentBadge.text} ${currentPaymentBadge.border}`}
                    >
                      <PaymentBadgeIcon className="h-3.5 w-3.5" />
                      <span>{currentPaymentBadge.label}</span>
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1116] p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                      <span>Travel Date</span>
                    </div>
                    <p className="mt-1.5 font-bold text-white text-sm sm:text-base">
                      {formattedDate}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1116] p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Start Time</span>
                    </div>
                    <p className="mt-1.5 font-bold text-white text-sm sm:text-base">
                      {booking.availability?.startTime ||
                        booking.startTime ||
                        "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1116] p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
                      <span>Participants</span>
                    </div>
                    <p className="mt-1.5 font-bold text-white text-sm sm:text-base">
                      {booking.participants || 1}{" "}
                      {Number(booking.participants) === 1 ? "Guest" : "Guests"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      <span>Total Amount</span>
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold text-amber-400 sm:text-xl">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: booking.currency || "INR",
                        maximumFractionDigits: 0,
                      }).format(booking.totalAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Status Notice Callout */}
                {isPending && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                    <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      Your booking request is awaiting tour operator review. Once accepted, online payment will be enabled.
                    </span>
                  </div>
                )}

                {isAcceptedOrConfirmed && !isPaid && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      Booking accepted by operator! Please complete your payment using &quot;Pay Now&quot; to confirm your reservation.
                    </span>
                  </div>
                )}

                {paymentStatus === "failed" && !isPaid && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>
                      Previous payment attempt was unsuccessful or cancelled. Click &quot;Retry Payment&quot; to complete payment.
                    </span>
                  </div>
                )}

                {isPaid && (
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold">
                        Payment confirmed and booking verified.
                      </span>
                    </div>
                    {booking.paidAt && (
                      <span className="font-mono text-xs text-emerald-300">
                        Paid on {new Date(booking.paidAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                )}

                {booking.rejectionReason && (
                  <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                    <strong>Reason for rejection:</strong> {booking.rejectionReason}
                  </div>
                )}

                {/* Footer action buttons */}
                <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    {booking.createdAt ? (
                      <span>
                        Booked on{" "}
                        {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {isPayNowEnabled ? (
                      <PayNowButton
                        bookingId={booking._id}
                        bookingStatus={booking.status}
                        paymentStatus={booking.paymentStatus}
                        totalAmount={booking.totalAmount}
                        currency={booking.currency}
                        customerName={customerNameDisplay}
                        customerEmail={booking.customerEmail || booking.user?.email}
                        customerPhone={booking.customerPhone || booking.user?.phone}
                        tourTitle={booking.tour?.title}
                        isProcessing={
                          processingBookingId !== null &&
                          processingBookingId !== booking._id
                        }
                        onPaymentStart={() =>
                          setProcessingBookingId(booking._id)
                        }
                        onPaymentEnd={() => setProcessingBookingId(null)}
                        onSuccess={() => handlePaymentSuccess(booking._id)}
                      />
                    ) : isPaid ? (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-5 py-3 text-sm font-bold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Payment Completed</span>
                      </div>
                    ) : isPending ? (
                      <button
                        type="button"
                        disabled
                        title="Operator must accept your booking before payment can be made"
                        className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-500"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Pay Now</span>
                      </button>
                    ) : null}

                    {/* --- CANCEL BOOKING BUTTON INTEGRATION --- */}
                    {bookingStatus !== "cancelled" && (bookingStatus === "confirmed" || bookingStatus === "accepted") && (
                      <CancelBookingButton
                        bookingId={booking._id}
                        bookingDate={dateValue || ""}
                        startTime={booking.availability?.startTime || booking.startTime || "10:00"}
                      />
                    )}
                    {/* ------------------------------------------- */}

                    <Link
                      href={`/bookings/${booking._id}`}
                      className="rounded-xl border border-white/15 bg-[#0b1116] px-5 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400"
                    >
                      View Details
                    </Link>

                    {booking.reviewSubmitted ? (
                      <span className="rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-3 text-center text-sm font-semibold text-emerald-300">
                        Review Submitted
                      </span>
                    ) : booking.reviewEligible ? (
                      <Link
                        href={`/reviews?bookingId=${booking._id}`}
                        className="rounded-xl bg-amber-500 px-5 py-3 text-center text-sm font-extrabold text-slate-950 transition hover:bg-amber-400"
                      >
                        Write a Review
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}