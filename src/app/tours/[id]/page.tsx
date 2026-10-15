"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Tour = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  destination?: string;
  location?: string;
  category?: string;
  price?: number;
  currency?: string;
  rating?: number;
  duration?: string | number;
  images?: string[];
  image?: string;
  highlights?: string[];
  included?: string[];
};

type Availability = {
  _id: string;
  tour: string | { _id: string };
  date: string;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
};

function getTourImage(tour: Tour, index: number) {
  const images = [
    ...(tour.images ?? []),
    ...(tour.image ? [tour.image] : []),
  ].filter(Boolean);

  return (
    images[index] ||
    images[0] ||
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85"
  );
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string) {
  return new Date(`${dateKey(value)}T12:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

export default function TourDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState("");
  const [guests, setGuests] = useState(1);

  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    async function fetchTour() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/tours/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Tour not found."
              : "Unable to load tour details."
          );
        }

        const result = await response.json();
        const tourData =
          result?.data?.tour ??
          result?.data ??
          result?.tour ??
          result;

        if (
          !tourData ||
          typeof tourData !== "object" ||
          Array.isArray(tourData)
        ) {
          throw new Error("Invalid tour data received.");
        }

        setTour(tourData as Tour);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchTour();

    return () => controller.abort();
  }, [id]);

  const fetchAvailability = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(
        `/api/availability?tourId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to load availability."
        );
      }

      const items: Availability[] = Array.isArray(result.data)
        ? result.data
        : [];
      setAvailabilityError("");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const availableItems = items.filter((item) => {
        const itemDate = new Date(item.date);

        return (
          item.isAvailable &&
          item.availableSeats > 0 &&
          !Number.isNaN(itemDate.getTime()) &&
          itemDate >= today
        );
      });

      setAvailability(availableItems);

      const dates = [
        ...new Set(availableItems.map((item) => dateKey(item.date))),
      ];

      setSelectedDate((current) =>
        dates.includes(current) ? current : dates[0] ?? ""
      );

      const validSlots = availableItems.filter(
        (item) => dateKey(item.date) === (dates.includes(selectedDate) ? selectedDate : dates[0])
      );

      setSelectedAvailabilityId((current) =>
        validSlots.some((item) => item._id === current)
          ? current
          : validSlots[0]?._id ?? ""
      );
    } catch (err) {
      setAvailabilityError(
        err instanceof Error
          ? err.message
          : "Unable to load availability."
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAvailability();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchAvailability]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-gray-600">
            Loading your adventure...
          </p>
        </div>
      </main>
    );
  }

  if (error || !tour) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="text-5xl">🏞️</div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Tour unavailable
        </h1>
        <p className="mt-3 text-gray-600">
          {error || "We could not find this tour."}
        </p>
        <button
          onClick={() => router.push("/tours")}
          className="mt-6 rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800"
        >
          Explore Tours
        </button>
      </main>
    );
  }

  const title = tour.title || tour.name || "Amazing Adventure";
  const destination =
    tour.destination || tour.location || "Explore the destination";

  const images = [
    ...(tour.images ?? []),
    ...(tour.image ? [tour.image] : []),
  ].filter(Boolean);

  const uniqueImages = [...new Set(images)];
  const price = Number(tour.price ?? 0);
  const validPrice = Number.isFinite(price) && price >= 0;
  const currency = tour.currency || "INR";

  const dates = [
    ...new Set(availability.map((item) => dateKey(item.date))),
  ];

  const slotsForDate = availability.filter(
    (item) => dateKey(item.date) === selectedDate
  );

  const selectedSlot = slotsForDate.find(
    (item) => item._id === selectedAvailabilityId
  );

  function handleDateChange(value: string) {
    setSelectedDate(value);
    setBookingError("");

    const firstSlot = availability.find(
      (item) => dateKey(item.date) === value
    );

    setSelectedAvailabilityId(firstSlot?._id ?? "");
    setGuests(1);
  }

  function handleBooking() {
    setBookingError("");

    if (!selectedSlot) {
      setBookingError("Please select an available date and time.");
      return;
    }

    if (guests < 1 || guests > selectedSlot.availableSeats) {
      setBookingError(
        `Only ${selectedSlot.availableSeats} seats are available.`
      );
      return;
    }

    const query = new URLSearchParams({
      tourId: id,
      availabilityId: selectedSlot._id,
      participants: String(guests),
      guests: String(guests),
      date: selectedDate,
    });

    router.push(`/bookings?${query.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#F7FAF8] pb-16">
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <nav className="text-sm text-gray-500">
          <button
            onClick={() => router.push("/")}
            className="hover:text-emerald-700"
          >
            Home
          </button>
          <span className="mx-2">/</span>
          <button
            onClick={() => router.push("/tours")}
            className="hover:text-emerald-700"
          >
            Tours
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{title}</span>
        </nav>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {tour.category && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {tour.category}
              </span>
            )}

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {title}
            </h1>

            <p className="mt-3 flex items-center gap-2 text-gray-600">
              <span className="text-lg">📍</span>
              {destination}
            </p>
          </div>

          {typeof tour.rating === "number" && (
            <div className="flex items-center gap-2 self-start rounded-xl bg-white px-4 py-3 shadow-sm sm:self-auto">
              <span className="text-xl text-amber-500">★</span>
              <span className="font-bold text-gray-900">
                {tour.rating.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">Rating</span>
            </div>
          )}
        </div>

        <section className="mt-7 grid gap-3 md:grid-cols-[1.7fr_1fr]">
          <div className="overflow-hidden rounded-2xl bg-gray-200">
            <img
              src={getTourImage(tour, selectedImage)}
              alt={title}
              className="h-[300px] w-full object-cover sm:h-[440px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {[0, 1].map((index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index + 1)}
                className={`overflow-hidden rounded-2xl bg-gray-200 text-left ring-2 transition ${
                  selectedImage === index + 1
                    ? "ring-emerald-600"
                    : "ring-transparent"
                }`}
                aria-label={`Show tour image ${index + 2}`}
              >
                <img
                  src={getTourImage(tour, index + 1)}
                  alt={`${title} view ${index + 2}`}
                  className="h-[145px] w-full object-cover transition duration-300 hover:scale-105 sm:h-[212px]"
                />
              </button>
            ))}
          </div>
        </section>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-7">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900">
                About this experience
              </h2>
              <p className="mt-4 whitespace-pre-line leading-8 text-gray-600">
                {tour.description ||
                  "Explore this destination and discover a memorable travel experience."}
              </p>

              <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {destination}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {tour.duration
                      ? typeof tour.duration === "number"
                        ? `${tour.duration} hours`
                        : tour.duration
                      : "Check availability"}
                  </p>
                </div>
              </div>
            </div>

            {tour.highlights && tour.highlights.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Highlights
                </h2>
                <ul className="mt-5 space-y-3">
                  {tour.highlights.map((item, index) => (
                    <li key={index} className="flex gap-3 text-gray-600">
                      <span className="font-bold text-emerald-700">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tour.included && tour.included.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  What&apos;s included
                </h2>
                <ul className="mt-5 space-y-3">
                  {tour.included.map((item, index) => (
                    <li key={index} className="flex gap-3 text-gray-600">
                      <span className="font-bold text-emerald-700">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
            <p className="text-sm text-gray-500">Starting from</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {validPrice ? formatPrice(price, currency) : "Contact us"}
              </span>
              <span className="text-sm text-gray-500">/ person</span>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="booking-date"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Available date
                </label>

                {availabilityLoading ? (
                  <p className="rounded-xl bg-emerald-50 p-4 text-sm text-gray-600">
                    Loading available dates...
                  </p>
                ) : availabilityError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">
                      {availabilityError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAvailabilityLoading(true);
                        setAvailabilityError("");
                        void fetchAvailability();
                      }}
                      className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800"
                    >
                      Try again
                    </button>
                  </div>
                ) : dates.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    No available dates at the moment. Please check again later.
                  </p>
                ) : (
                  <select
                    id="booking-date"
                    value={selectedDate}
                    onChange={(event) => handleDateChange(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {dates.map((value) => (
                      <option key={value} value={value}>
                        {formatDate(value)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedDate && slotsForDate.length > 0 && (
                <div>
                  <label
                    htmlFor="booking-slot"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Available time
                  </label>
                  <select
                    id="booking-slot"
                    value={selectedAvailabilityId}
                    onChange={(event) => {
                      setSelectedAvailabilityId(event.target.value);
                      setGuests(1);
                      setBookingError("");
                    }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {slotsForDate.map((slot) => (
                      <option key={slot._id} value={slot._id}>
                        {slot.startTime}
                        {slot.endTime ? ` - ${slot.endTime}` : ""}
                        {" · "}
                        {slot.availableSeats} seats left
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSlot && (
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {selectedSlot.availableSeats} seats available
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    Total capacity: {selectedSlot.totalSeats}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="guests"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Number of guests
                </label>
                <select
                  id="guests"
                  value={guests}
                  disabled={!selectedSlot}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
                >
                  {Array.from(
                    { length: selectedSlot?.availableSeats ?? 0 },
                    (_, index) => index + 1
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">Price per person</span>
                  <span className="font-medium text-gray-900">
                    {validPrice ? formatPrice(price, currency) : "Unavailable"}
                  </span>
                </div>
                <div className="mt-3 flex justify-between gap-3 border-t border-emerald-100 pt-3">
                  <span className="font-semibold text-gray-800">
                    Estimated total
                  </span>
                  <span className="font-bold text-emerald-800">
                    {validPrice
                      ? formatPrice(price * guests, currency)
                      : "Contact us"}
                  </span>
                </div>
              </div>

              {bookingError && (
                <p role="alert" className="text-sm text-red-600">
                  {bookingError}
                </p>
              )}

              <button
                type="button"
                onClick={handleBooking}
                disabled={
                  !validPrice ||
                  availabilityLoading ||
                  !selectedSlot ||
                  guests > (selectedSlot?.availableSeats ?? 0)
                }
                className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Book Now →
              </button>

              <p className="text-center text-xs leading-5 text-gray-500">
                Availability is checked again when the booking is submitted.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
