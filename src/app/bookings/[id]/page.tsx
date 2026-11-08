"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock4,
  ArrowLeft,
  CreditCard,
  MessageSquare,
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
  tour?: {
    _id?: string;
    title?: string;
    destination?: string;
    price?: number;
    currency?: string;
    duration?: string;
    durationUnit?: string;
  };
  availability?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = String(params.id);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void loadRazorpayScript().catch(() => {});
  }, []);

  const loadBooking = useCallback(async () => {
    try {
      const response = await fetch("/api/bookings", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/bookings/${bookingId}`)}`
        );
        return;
      }

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || "Unable to load bookings.");
      }

      const bookings: Booking[] = Array.isArray(result.data) ? result.data : [];
      const found = bookings.find((item) => String(item._id) === bookingId);

      if (!found) {
        throw new Error("Booking not found.");
      }

      setBooking(found);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking, reloadKey]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-5 py-20 text-center text-gray-600">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm border">
          <Clock className="h-5 w-5 animate-spin text-emerald-700" />
          <span>Loading your booking details...</span>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Booking details unavailable
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "Booking not found."}
          </p>
          <Link
            href="/bookings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to My Bookings</span>
          </Link>
        </div>
      </main>
    );
  }

  const tourTitle = booking.tour?.title || "Tour Experience";
  const destination = booking.tour?.destination || "Destination";
  const date = booking.availability?.date || booking.bookingDate;
  const time = booking.availability?.startTime || booking.startTime;
  const currency = booking.currency || booking.tour?.currency || "INR";

  const total = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(booking.totalAmount ?? 0);

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
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
  // - CONFIRMED booking + UNPAID → Pay Now enabled
  // - CONFIRMED booking + PAID → Show Payment Completed
  // - REJECTED/CANCELLED → Payment disabled
  const isPayNowEnabled =
    isAcceptedOrConfirmed &&
    !isPaid &&
    paymentStatus !== "refunded";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Bookings</span>
          </Link>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl text-emerald-700">
              ✓
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">
              Wayora · Tour Booking
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Booking #{booking._id.slice(-8).toUpperCase()}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Reservation details and real-time payment status.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Booking Reference
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-gray-900 break-all">
                {booking._id}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  isAcceptedOrConfirmed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : isPending
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-gray-100 border-gray-300 text-gray-700"
                }`}
              >
                {bookingStatus}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  isPaid
                    ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                    : paymentStatus === "failed"
                      ? "bg-red-100 border-red-300 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-700"
                }`}
              >
                {paymentStatus}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tour Experience
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                {tourTitle}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{destination}</span>
              </div>
            </div>

            <div className="grid gap-4 border-y border-gray-100 py-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                  <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Travel Date</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-gray-900">
                  {formattedDate}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                  <Clock className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Start Time</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-gray-900">
                  {time || "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                  <Users className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Participants</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-gray-900">
                  {booking.participants ?? 1} Guests
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100">
                <div className="text-xs font-semibold uppercase text-emerald-800">
                  Total Amount
                </div>
                <p className="mt-1.5 text-xl font-extrabold text-emerald-800">
                  {total}
                </p>
              </div>
            </div>

            {booking.specialRequirements && (
              <div className="rounded-2xl bg-gray-50 p-4 border">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Special requirements
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {booking.specialRequirements}
                </p>
              </div>
            )}

            {isPending && (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 border border-amber-200">
                Your booking is currently <strong>Pending Operator Approval</strong>.
                Once the tour operator accepts your request, online payment via Razorpay will be enabled.
              </div>
            )}

            {isAcceptedOrConfirmed && !isPaid && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 border border-emerald-200">
                Your booking has been <strong>Accepted & Confirmed</strong> by the operator! Complete payment now using &quot;Pay Now&quot; to secure your booking.
              </div>
            )}

            {isPaid && (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span>Payment verified and booking confirmed!</span>
                </div>
                {booking.paidAt && (
                  <span className="font-mono text-xs text-emerald-800">
                    Paid on {new Date(booking.paidAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
            )}

            {/* CONFIRMED + UNPAID → Pay Now enabled */}
            {isPayNowEnabled && (
              <div className="rounded-2xl bg-emerald-50/50 p-6 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900">Payment Due: {total}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Pay securely using Razorpay (UPI, Credit/Debit Cards, NetBanking).
                  </p>
                </div>
                <PayNowButton
                  bookingId={booking._id}
                  bookingStatus={booking.status}
                  paymentStatus={booking.paymentStatus}
                  totalAmount={booking.totalAmount}
                  currency={booking.currency}
                  customerName={booking.customerName}
                  customerEmail={booking.customerEmail}
                  customerPhone={booking.customerPhone}
                  tourTitle={booking.tour?.title}
                  onSuccess={() => setReloadKey((k) => k + 1)}
                />
              </div>
            )}

            {/* PENDING → Payment disabled button */}
            {isPending && (
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">Payment opens upon operator acceptance</span>
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-400 cursor-not-allowed border"
                >
                  Pay Now
                </button>
              </div>
            )}

            {/* CONFIRMED + PAID → Payment Completed */}
            {isPaid && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-100 border border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <span>Payment Completed</span>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link
              href={`/messages?bookingId=${booking._id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-700 bg-teal-50 px-5 py-3 text-center font-semibold text-teal-800 shadow-sm transition hover:bg-teal-100"
            >
              <MessageSquare size={18} />
              <span>Message Operator</span>
            </Link>

            <Link
              href="/bookings"
              className="rounded-xl bg-gray-100 px-5 py-3 text-center font-semibold text-gray-800 transition hover:bg-gray-200"
            >
              View All Bookings
            </Link>

            <Link
              href="/tours"
              className="rounded-xl border border-gray-300 px-5 py-3 text-center font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              Explore More Tours
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
