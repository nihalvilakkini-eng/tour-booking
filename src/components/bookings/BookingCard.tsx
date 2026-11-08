"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock4,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import PayNowButton from "@/components/payments/PayNowButton";

export interface BookingCardProps {
  booking: {
    _id: string;
    bookingDate?: string;
    startTime?: string;
    participants?: number;
    totalAmount?: number;
    currency?: string;
    status?: string;
    paymentStatus?: string;
    paidAt?: string | null;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    rejectionReason?: string;
    reviewSubmitted?: boolean;
    reviewEligible?: boolean;
    createdAt?: string;
    user?: {
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
    };
    availability?: {
      date?: string;
      startTime?: string;
    };
  };
  isProcessingOther?: boolean;
  onPaymentStart?: () => void;
  onPaymentEnd?: () => void;
  onSuccess?: () => void;
}

export default function BookingCard({
  booking,
  isProcessingOther = false,
  onPaymentStart,
  onPaymentEnd,
  onSuccess,
}: BookingCardProps) {
  const dateValue = booking.availability?.date || booking.bookingDate;

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

  // Expected behaviour:
  // - PENDING booking → Payment disabled
  // - CONFIRMED/ACCEPTED booking + UNPAID → Pay Now enabled
  // - CONFIRMED booking + PAID → Show Payment Completed
  // - REJECTED/CANCELLED → Payment disabled
  const isPayNowEnabled =
    isAcceptedOrConfirmed &&
    !isPaid &&
    paymentStatus !== "refunded";

  const customerNameDisplay =
    booking.customerName ||
    (booking.user?.name
      ? `${booking.user.name} ${booking.user.lastName || ""}`.trim()
      : "");

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="font-mono text-xs font-semibold text-gray-500">
            REF #{booking._id.slice(-8).toUpperCase()}
          </span>

          <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
            {booking.tour?.title || "Tour Experience"}
          </h2>

          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{booking.tour?.destination || "Destination"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              isAcceptedOrConfirmed
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isPending
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {bookingStatus}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              isPaid
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : paymentStatus === "failed"
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : paymentStatus === "failed" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Clock4 className="h-3.5 w-3.5" />
            )}
            <span>{paymentStatus}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4">
        <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Calendar className="h-3.5 w-3.5 text-emerald-700" />
            <span>Travel Date</span>
          </div>
          <p className="mt-1.5 text-sm sm:text-base font-bold text-gray-900">
            {formattedDate}
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Clock className="h-3.5 w-3.5 text-emerald-700" />
            <span>Start Time</span>
          </div>
          <p className="mt-1.5 text-sm sm:text-base font-bold text-gray-900">
            {booking.availability?.startTime || booking.startTime || "Not specified"}
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Users className="h-3.5 w-3.5 text-emerald-700" />
            <span>Participants</span>
          </div>
          <p className="mt-1.5 text-sm sm:text-base font-bold text-gray-900">
            {booking.participants || 1} Guests
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50/70 p-3 sm:p-4 border border-emerald-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Total Amount
          </div>
          <p className="mt-1.5 text-lg sm:text-xl font-extrabold text-emerald-800">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: booking.currency || "INR",
              maximumFractionDigits: 0,
            }).format(booking.totalAmount || 0)}
          </p>
        </div>
      </div>

      {isPending && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3.5 text-xs text-amber-900 border border-amber-200">
          <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <span>
            Awaiting operator approval before payment can be completed.
          </span>
        </div>
      )}

      {isAcceptedOrConfirmed && !isPaid && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-emerald-50/80 p-3.5 text-xs text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <span>
            Booking confirmed by operator! Please complete payment to secure your seats.
          </span>
        </div>
      )}

      {paymentStatus === "failed" && !isPaid && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-900 border border-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span>
            Payment was unsuccessful or cancelled. Click &quot;Pay Now&quot; to retry.
          </span>
        </div>
      )}

      {isPaid && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Payment verified and booking confirmed!</span>
        </div>
      )}

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
              isProcessing={isProcessingOther}
              onPaymentStart={onPaymentStart}
              onPaymentEnd={onPaymentEnd}
              onSuccess={onSuccess}
            />
          ) : isPaid ? (
            /* CONFIRMED + PAID → Show Payment Completed */
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 px-4 py-3 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Payment Completed</span>
            </div>
          ) : isPending ? (
            /* PENDING → Payment disabled */
            <button
              type="button"
              disabled
              title="Operator must accept your booking before payment can be made"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed border border-gray-200"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Now</span>
            </button>
          ) : null}

          <Link
            href={`/messages?bookingId=${booking._id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-700 bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-100"
          >
            <MessageSquare size={16} />
            <span>Message Operator</span>
          </Link>

          <Link
            href={`/bookings/${booking._id}`}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
