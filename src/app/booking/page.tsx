"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TourImage from "@/components/tours/TourImage";

export const dynamic = "force-dynamic";

interface Tour {
  _id: string;
  title?: string;
  name?: string;
  destination?: string;
  price: number;
  currency?: string;
  image?: string;
  images?: string[];
  maxParticipants?: number;
}

interface Slot {
  _id: string;
  tour: string | { _id: string; title?: string };
  date: string;
  startTime: string;
  endTime?: string;
  availableSeats: number;
  isAvailable: boolean;
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourId = searchParams.get("tourId") || "";
  const initialAvailabilityId = searchParams.get("availabilityId") || "";
  const initialGuests = Number(searchParams.get("guests") || searchParams.get("participants") || "1");

  const [tour, setTour] = useState<Tour | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState(initialAvailabilityId);
  const [guests, setGuests] = useState(initialGuests > 0 ? initialGuests : 1);
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!tourId) return;

    async function loadBookingData() {
      try {
        setLoading(true);
        setError("");

        const [tourResponse, availabilityResponse] = await Promise.all([
          fetch(`/api/tours/${encodeURIComponent(tourId)}`, {
            cache: "no-store",
          }),
          fetch(`/api/availability?tourId=${encodeURIComponent(tourId)}`, {
            cache: "no-store",
          }),
        ]);

        const tourResult = await tourResponse.json();
        const availabilityResult = await availabilityResponse.json();

        if (!tourResponse.ok) {
          throw new Error(
            tourResult?.message || "Unable to load tour details."
          );
        }

        if (!availabilityResponse.ok) {
          throw new Error(
            availabilityResult?.message || "Unable to load availability."
          );
        }

        const tourData =
          tourResult?.data?.tour ??
          tourResult?.data ??
          tourResult?.tour ??
          tourResult;

        const slotData = Array.isArray(availabilityResult?.data)
          ? availabilityResult.data
          : [];

        setTour(tourData);
        setSlots(slotData);
        if (initialAvailabilityId && slotData.some((s: Slot) => s._id === initialAvailabilityId)) {
          setSelectedSlot(initialAvailabilityId);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load booking details."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookingData();
  }, [tourId, initialAvailabilityId]);

  const selectedAvailability = slots.find(
    (slot) => slot._id === selectedSlot
  );

  const maxGuests = Math.max(
    1,
    selectedAvailability?.availableSeats ?? tour?.maxParticipants ?? 50
  );

  const totalPrice = useMemo(
    () => (tour?.price ?? 0) * guests,
    [tour?.price, guests]
  );

  async function handleBooking() {
    setError("");
    setSuccess("");

    if (!tourId) {
      setError("Tour ID is missing.");
      return;
    }

    if (!selectedSlot || !selectedAvailability) {
      setError("Please select an available date and time.");
      return;
    }

    if (guests < 1 || guests > selectedAvailability.availableSeats) {
      setError("Please select a valid number of guests.");
      return;
    }

    try {
      setSubmitting(true);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("wayora_token") || localStorage.getItem("token")
          : null;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          availabilityId: selectedSlot,
          participants: guests,
          specialRequirements: requirements,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/booking?tourId=${tourId}`)}`
        );
        return;
      }

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || "Booking could not be created.");
      }

      window.dispatchEvent(new Event("wayora-booking-change"));

      const bookingId = result?.data?._id;

      setSuccess(result?.message || "Booking request created successfully!");

      if (bookingId) {
        router.push(`/bookings/${bookingId}?success=1`);
        return;
      }

      router.push("/bookings");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && tourId) {
    return (
      <main className="px-5 py-20 text-center">
        Loading booking details...
      </main>
    );
  }

  if (!tour) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Tour unavailable</h1>
        <p className="mt-3 text-red-600">
          {error || (!tourId ? "Please select a tour first." : "")}
        </p>
        <button
          onClick={() => router.push("/tours")}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-white"
        >
          Explore Tours
        </button>
      </main>
    );
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: tour.currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <main className="min-h-screen bg-slate-900 px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-400">
          Wayora · Booking
        </p>

        <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
          Reserve your experience
        </h1>

        <p className="mt-3 text-slate-400">
          Choose an available session and confirm your booking request.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <section className="space-y-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 lg:col-span-3">
            <h2 className="text-xl font-bold text-white">Booking details</h2>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Available date and time
              </label>

              {slots.length === 0 ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                  No available sessions for this tour yet. Please check again
                  later.
                </p>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <label
                      key={slot._id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition ${
                        selectedSlot === slot._id
                          ? "border-amber-500 bg-amber-500/10 text-white"
                          : "border-slate-700 bg-slate-900/50 text-slate-200 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="availability"
                          value={slot._id}
                          checked={selectedSlot === slot._id}
                          onChange={() => {
                            setSelectedSlot(slot._id);
                            setGuests((current) =>
                              Math.min(current, slot.availableSeats)
                            );
                          }}
                        />

                        <div>
                          <p className="font-semibold text-white">
                            {new Date(slot.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </p>
                          <p className="text-sm text-slate-400">
                            {slot.startTime}
                            {slot.endTime ? ` – ${slot.endTime}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-amber-400">
                        {slot.availableSeats} seats left
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="guests"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Participants
              </label>
              <select
                id="guests"
                value={Math.min(guests, maxGuests)}
                onChange={(event) => setGuests(Number(event.target.value))}
                disabled={!selectedSlot}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-500"
              >
                {Array.from({ length: maxGuests }, (_, index) => index + 1).map(
                  (count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "participant" : "participants"}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="requirements"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Special requirements (optional)
              </label>
              <textarea
                id="requirements"
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Any requests for the tour operator?"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {success}
              </p>
            )}

            <button
              onClick={handleBooking}
              disabled={submitting || slots.length === 0 || !selectedSlot}
              className="w-full rounded-xl bg-amber-500 px-5 py-4 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating booking..." : "Confirm Booking Request"}
            </button>

            <p className="text-xs leading-5 text-slate-400">
              Your booking is created with pending status. Payment is only
              available after the operator accepts your booking.
            </p>
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 lg:col-span-2">
            <div className="relative h-52 w-full">
              <TourImage
                image={tour.image}
                images={tour.images}
                alt={tour.title || tour.name || "Selected tour"}
                className="object-cover"
              />
            </div>

            <div className="space-y-4 p-6 text-slate-200">
              <p className="text-sm text-slate-400">
                {tour.destination || "Your selected destination"}
              </p>
              <h2 className="text-xl font-bold text-white">
                {tour.title || tour.name || "Selected Tour"}
              </h2>

              <div className="flex justify-between text-sm text-slate-400">
                <span>Price per participant</span>
                <span className="text-slate-200">{formatPrice(tour.price || 0)}</span>
              </div>

              <div className="flex justify-between text-sm text-slate-400">
                <span>Participants</span>
                <span className="text-slate-200">{guests}</span>
              </div>

              <div className="flex justify-between border-t border-slate-700 pt-4 text-lg font-bold">
                <span>Estimated total</span>
                <span className="text-amber-400">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-900 px-5 py-20 text-center text-slate-100">
          <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-850 p-8 shadow-xl">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-400">Loading booking checkout...</p>
          </div>
        </main>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
