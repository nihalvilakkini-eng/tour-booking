"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
      const response = await fetch("/api/bookings", {
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
    void loadBookings();
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
      <main className="min-h-screen bg-gray-50 px-5 py-20 text-center">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm border border-gray-200">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
          <span className="font-medium text-gray-700">Loading your bookings...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              View tour reservations, monitor approval status and complete payments securely.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadBookings();
            }}
            className="inline-flex self-start sm:self-auto items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Unable to load bookings</p>
              <p className="mt-0.5 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!error && bookings.length === 0 && (
          <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Compass className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              No bookings yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600">
              When you book a tour experience, your reservation details and payment status will appear here.
            </p>
            <Link
              href="/tours"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
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

            // Normalized statuses (case-insensitive)
            const bookingStatus = String(booking.status || "pending").trim().toLowerCase();
            const paymentStatus = String(booking.paymentStatus || "unpaid").trim().toLowerCase();

            const isAcceptedOrConfirmed =
              bookingStatus === "accepted" || bookingStatus === "confirmed";
            const isPending = bookingStatus === "pending";
            const isRejectedOrCancelled =
              bookingStatus === "rejected" || bookingStatus === "cancelled";
            const isPaid = paymentStatus === "paid";

            // Payment Eligibility:
            // - PENDING booking → Payment disabled
            // - CONFIRMED/ACCEPTED booking + UNPAID/FAILED/PENDING → Pay Now enabled
            // - CONFIRMED booking + PAID → Show Payment Completed
            // - REJECTED/CANCELLED booking → Payment disabled
            const isPayNowEnabled =
              isAcceptedOrConfirmed &&
              !isPaid &&
              paymentStatus !== "refunded";

            // Badges styling
            const bookingBadgeConfig: Record<
              string,
              { label: string; bg: string; text: string; border: string }
            > = {
              pending: {
                label: "Pending Approval",
                bg: "bg-amber-50",
                text: "text-amber-800",
                border: "border-amber-200",
              },
              accepted: {
                label: "Accepted",
                bg: "bg-emerald-50",
                text: "text-emerald-800",
                border: "border-emerald-200",
              },
              confirmed: {
                label: "Confirmed",
                bg: "bg-emerald-50",
                text: "text-emerald-800",
                border: "border-emerald-200",
              },
              completed: {
                label: "Completed",
                bg: "bg-emerald-50",
                text: "text-emerald-800",
                border: "border-emerald-200",
              },
              rejected: {
                label: "Rejected",
                bg: "bg-red-50",
                text: "text-red-800",
                border: "border-red-200",
              },
              cancelled: {
                label: "Cancelled",
                bg: "bg-gray-100",
                text: "text-gray-700",
                border: "border-gray-200",
              },
            };

            const currentBookingBadge =
              bookingBadgeConfig[bookingStatus] || {
                label: booking.status || "Pending",
                bg: "bg-gray-50",
                text: "text-gray-700",
                border: "border-gray-200",
              };

            const paymentBadgeConfig: Record<
              string,
              { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
            > = {
              paid: {
                label: "Paid",
                bg: "bg-emerald-100",
                text: "text-emerald-800",
                border: "border-emerald-300",
                icon: CheckCircle2,
              },
              pending: {
                label: "Payment Pending",
                bg: "bg-amber-100",
                text: "text-amber-800",
                border: "border-amber-300",
                icon: Clock4,
              },
              unpaid: {
                label: "Unpaid",
                bg: "bg-slate-100",
                text: "text-slate-700",
                border: "border-slate-300",
                icon: AlertCircle,
              },
              failed: {
                label: "Payment Failed",
                bg: "bg-red-100",
                text: "text-red-800",
                border: "border-red-300",
                icon: AlertCircle,
              },
              refunded: {
                label: "Refunded",
                bg: "bg-purple-100",
                text: "text-purple-800",
                border: "border-purple-300",
                icon: AlertCircle,
              },
            };

            const currentPaymentBadge =
              paymentBadgeConfig[paymentStatus] || {
                label: booking.paymentStatus || "Unpaid",
                bg: "bg-gray-100",
                text: "text-gray-700",
                border: "border-gray-200",
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
                className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                {/* Header row */}
                <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-500">
                        REF #{booking._id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                      {booking.tour?.title || "Tour Experience"}
                    </h2>

                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
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
                  <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Travel Date</span>
                    </div>
                    <p className="mt-1.5 font-bold text-gray-900 text-sm sm:text-base">
                      {formattedDate}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Start Time</span>
                    </div>
                    <p className="mt-1.5 font-bold text-gray-900 text-sm sm:text-base">
                      {booking.availability?.startTime ||
                        booking.startTime ||
                        "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <Users className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Participants</span>
                    </div>
                    <p className="mt-1.5 font-bold text-gray-900 text-sm sm:text-base">
                      {booking.participants || 1}{" "}
                      {Number(booking.participants) === 1 ? "Guest" : "Guests"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 p-3 sm:p-4 border border-emerald-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                      <span>Total Amount</span>
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold text-emerald-800 sm:text-xl">
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
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3.5 text-xs text-amber-900 border border-amber-200">
                    <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <span>
                      Your booking request is awaiting tour operator review. Once accepted, online payment will be enabled.
                    </span>
                  </div>
                )}

                {isAcceptedOrConfirmed && !isPaid && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-emerald-50/80 p-3.5 text-xs text-emerald-900 border border-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>
                      Booking accepted by operator! Please complete your payment using &quot;Pay Now&quot; to confirm your reservation.
                    </span>
                  </div>
                )}

                {paymentStatus === "failed" && !isPaid && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-900 border border-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                    <span>
                      Previous payment attempt was unsuccessful or cancelled. Click &quot;Retry Payment&quot; to complete payment.
                    </span>
                  </div>
                )}

                {isPaid && (
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-900 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span className="font-semibold">
                        Payment confirmed and booking verified.
                      </span>
                    </div>
                    {booking.paidAt && (
                      <span className="font-mono text-xs text-emerald-800">
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
                  <div className="mb-5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
                    <strong>Reason for rejection:</strong> {booking.rejectionReason}
                  </div>
                )}

                {/* Footer action buttons */}
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-gray-500">
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
                    {/* CONFIRMED + UNPAID → Pay Now enabled */}
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
                      /* CONFIRMED + PAID → Show Payment Completed */
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span>Payment Completed</span>
                      </div>
                    ) : isPending ? (
                      /* PENDING booking → Payment disabled */
                      <button
                        type="button"
                        disabled
                        title="Operator must accept your booking before payment can be made"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400 shadow-none cursor-not-allowed border border-gray-200"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Pay Now</span>
                      </button>
                    ) : null}

                    <Link
                      href={`/bookings/${booking._id}`}
                      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                    >
                      View Details
                    </Link>

                    {booking.reviewSubmitted ? (
                      <span className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 border border-emerald-200">
                        Review Submitted
                      </span>
                    ) : booking.reviewEligible ? (
                      <Link
                        href={`/reviews?bookingId=${booking._id}`}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
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
