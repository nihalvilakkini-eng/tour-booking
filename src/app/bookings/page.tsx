"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourId = searchParams.get("tourId") || "";

  const [tour, setTour] = useState<Tour | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [guests, setGuests] = useState(1);
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
          fetch(
            `/api/availability?tourId=${encodeURIComponent(tourId)}`,
            { cache: "no-store" }
          ),
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load booking details."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookingData();
  }, [tourId]);

  const selectedAvailability = slots.find(
    (slot) => slot._id === selectedSlot
  );

  const maxGuests = Math.max(
    1,
    Math.min(
      20,
      selectedAvailability?.availableSeats ?? 20,
      tour?.maxParticipants ?? 20
    )
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

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          `/login?redirect=${encodeURIComponent(
            `/bookings?tourId=${tourId}`
          )}`
        );
        return;
      }

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || "Booking could not be created.");
      }

      setSuccess(
        result?.message || "Booking request created successfully!"
      );

      const bookingId = result?.data?._id;

      if (bookingId) {
        router.push(`/bookings/${bookingId}?success=1`);
        return;
      }
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
    <main className="min-h-screen bg-gray-50 px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Wayora · Booking
        </p>

        <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">
          Reserve your experience
        </h1>

        <p className="mt-3 text-gray-600">
          Choose an available session and confirm your booking request.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 lg:col-span-3">
            <h2 className="text-xl font-bold">Booking details</h2>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Available date and time
              </label>

              {slots.length === 0 ? (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  No available sessions for this tour yet. Please check again
                  later.
                </p>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <label
                      key={slot._id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${
                        selectedSlot === slot._id
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-gray-200"
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
                              Math.min(
                                current,
                                slot.availableSeats,
                                tour.maxParticipants ?? 20
                              )
                            );
                          }}
                        />

                        <div>
                          <p className="font-semibold text-gray-900">
                            {new Date(slot.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {slot.startTime}
                            {slot.endTime ? ` – ${slot.endTime}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-gray-500">
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
                className="mb-2 block text-sm font-semibold"
              >
                Participants
              </label>
              <select
                id="guests"
                value={Math.min(guests, maxGuests)}
                onChange={(event) => setGuests(Number(event.target.value))}
                disabled={!selectedSlot}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
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
                className="mb-2 block text-sm font-semibold"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-600"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                {success}
              </p>
            )}

            <button
              onClick={handleBooking}
              disabled={submitting || slots.length === 0 || !selectedSlot}
              className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating booking..." : "Confirm Booking Request"}
            </button>

            <p className="text-xs leading-5 text-gray-500">
              Your booking is created with pending status. This button does not
              process a payment.
            </p>
          </section>

          <aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white lg:col-span-2">
            <img
              src={
                tour.image ||
                tour.images?.[0] ||
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900"
              }
              alt={tour.title || tour.name || "Selected tour"}
              className="h-52 w-full object-cover"
            />

            <div className="space-y-4 p-6">
              <p className="text-sm text-gray-500">
                {tour.destination || "Your selected destination"}
              </p>
              <h2 className="text-xl font-bold">
                {tour.title || tour.name || "Selected Tour"}
              </h2>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Price per participant</span>
                <span>{formatPrice(tour.price || 0)}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Participants</span>
                <span>{guests}</span>
              </div>

              <div className="flex justify-between border-t border-gray-100 pt-4 text-lg font-bold">
                <span>Estimated total</span>
                <span className="text-emerald-700">
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