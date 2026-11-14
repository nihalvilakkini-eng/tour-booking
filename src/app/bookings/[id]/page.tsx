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
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("wayora_token") || localStorage.getItem("token")
          : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Try fetching single booking directly first
      let response = await fetch(`/api/bookings/${bookingId}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/bookings/${bookingId}`)}`
        );
        return;
      }

      let result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data) {
        setBooking(result.data);
        setError("");
        return;
      }

      // Fallback to list of user bookings
      response = await fetch("/api/bookings?mine=true", {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/bookings/${bookingId}`)}`
        );
        return;
      }

      result = await response.json().catch(() => null);

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || "Unable to load booking details.");
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
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-900 px-5 py-20 text-center text-slate-300">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-6 py-4 shadow-xl">
          <Clock className="h-5 w-5 animate-spin text-amber-400" />
          <span>Loading your booking details...</span>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-slate-900 px-5 py-20 text-center text-slate-100">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-2xl font-bold text-white">
            Booking details unavailable
          </h1>
          <p className="mt-2 text-sm text-rose-300">
            {error || "Booking not found."}
          </p>
          <Link
            href="/bookings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
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
    <main className="min-h-screen bg-slate-900 px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to My Bookings</span>
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-2xl sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 text-3xl text-amber-400">
              ✓
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-400">
              Wayora · Tour Booking
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              Booking #{booking._id.slice(-8).toUpperCase()}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Reservation details and real-time payment status.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Booking Reference
              </p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-white">
                {booking._id}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  isAcceptedOrConfirmed
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : isPending
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-600 bg-slate-700 text-slate-300"
                }`}
              >
                {bookingStatus}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  isPaid
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                    : paymentStatus === "failed"
                      ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                      : "border-slate-600 bg-slate-700 text-slate-300"
                }`}
              >
                {paymentStatus}
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tour Experience
              </p>
              <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                {tourTitle}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{destination}</span>
              </div>
            </div>

            <div className="grid gap-4 border-y border-slate-700 py-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Travel Date</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-white">
                  {formattedDate}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Start Time</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-white">
                  {time || "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span>Participants</span>
                </div>
                <p className="mt-1.5 text-base font-bold text-white">
                  {booking.participants ?? 1} Guests
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="text-xs font-semibold uppercase text-amber-300">
                  Total Amount
                </div>
                <p className="mt-1.5 text-xl font-extrabold text-amber-400">
                  {total}
                </p>
              </div>
            </div>

            {booking.specialRequirements && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Special requirements
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {booking.specialRequirements}
                </p>
              </div>
            )}

            {isPending && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Your booking is currently <strong>Pending Operator Approval</strong>.
                Once the tour operator accepts your request, online payment via Razorpay will be enabled.
              </div>
            )}

            {isAcceptedOrConfirmed && !isPaid && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Your booking has been <strong>Accepted & Confirmed</strong> by the operator! Complete payment now using &quot;Pay Now&quot; to secure your booking.
              </div>
            )}

            {isPaid && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Payment verified and booking confirmed!</span>
                </div>
                {booking.paidAt && (
                  <span className="font-mono text-xs text-emerald-300">
                    Paid on {new Date(booking.paidAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
            )}

            {/* CONFIRMED + UNPAID → Pay Now enabled */}
            {isPayNowEnabled && (
              <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-white">Payment Due: {total}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
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
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                <span className="text-sm text-slate-400">Payment opens upon operator acceptance</span>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-500"
                >
                  Pay Now
                </button>
              </div>
            )}

            {/* CONFIRMED + PAID → Payment Completed */}
            {isPaid && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-3 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Payment Completed</span>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link
              href={`/messages?bookingId=${booking._id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-5 py-3 text-center font-semibold text-amber-300 shadow-sm transition hover:bg-amber-500/25"
            >
              <MessageSquare size={18} />
              <span>Message Operator</span>
            </Link>

            <Link
              href="/bookings"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-center font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
            >
              View All Bookings
            </Link>

            <Link
              href="/tours"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-center font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
            >
              Explore More Tours
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
