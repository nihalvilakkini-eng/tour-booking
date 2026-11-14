"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star } from "lucide-react";
import TourItinerary from "@/components/tours/TourItinerary";
import type { IItineraryDay } from "@/models/Tour";

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
  reviewCount?: number;
  duration?: string | number;
  images?: string[];
  image?: string;
  highlights?: string[];
  included?: string[];
  itineraryDays?: IItineraryDay[];
};

type CustomerReview = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user?: { name?: string; lastName?: string } | null;
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
    "/tour-placeholder.svg"
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
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState("");
  const [guests, setGuests] = useState(1);

  const [bookingError, setBookingError] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    async function fetchReviews() {
      try {
        setReviewsLoading(true);
        setReviewsError("");
        const response = await fetch(
          `/api/reviews?tourId=${encodeURIComponent(id)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const result = await response.json();

        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || "Unable to load customer reviews.");
        }

        setReviews(result.data as CustomerReview[]);
      } catch (reviewError) {
        if (reviewError instanceof Error && reviewError.name === "AbortError") return;
        setReviewsError(
          reviewError instanceof Error
            ? reviewError.message
            : "Unable to load customer reviews."
        );
      } finally {
        if (!controller.signal.aborted) setReviewsLoading(false);
      }
    }

    void fetchReviews();
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
      <main className="flex min-h-[60vh] items-center justify-center bg-[#0b1116]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-500" />
          <p className="mt-4 text-slate-400">
            Loading your adventure...
          </p>
        </div>
      </main>
    );
  }

  if (error || !tour) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center bg-[#0b1116]">
        <div className="text-5xl">🏞️</div>
        <h1 className="mt-4 text-3xl font-bold text-white">
          Tour unavailable
        </h1>
        <p className="mt-3 text-slate-400">
          {error || "We could not find this tour."}
        </p>
        <button
          onClick={() => router.push("/tours")}
          className="mt-6 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
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

  async function handleBooking() {
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

    try {
      setSubmittingBooking(true);

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
          availabilityId: selectedSlot._id,
          participants: guests,
        }),
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/tours/${id}`)}`
        );
        return;
      }

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Booking could not be created.");
      }

      window.dispatchEvent(new Event("wayora-booking-change"));

      router.push("/bookings");
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to create booking."
      );
    } finally {
      setSubmittingBooking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1116] pb-16 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <nav className="text-sm text-slate-400">
          <button
            onClick={() => router.push("/")}
            className="transition hover:text-amber-400"
          >
            Home
          </button>
          <span className="mx-2 text-slate-600">/</span>
          <button
            onClick={() => router.push("/tours")}
            className="transition hover:text-amber-400"
          >
            Tours
          </button>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">{title}</span>
        </nav>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {tour.category && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                {tour.category}
              </span>
            )}

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>

            <p className="mt-3 flex items-center gap-2 text-slate-400">
              <span className="text-lg">📍</span>
              {destination}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-[#121a22] px-4 py-3 shadow-lg sm:self-auto">
            <span className="text-xl text-amber-400">★</span>
            <span className="font-bold text-white">
              {(tour.rating ?? 0).toFixed(1)}
            </span>
            <span className="text-sm text-slate-400">
              {tour.reviewCount ?? reviews.length}{" "}
              {(tour.reviewCount ?? reviews.length) === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        <section className="mt-7 grid gap-3 md:grid-cols-[1.7fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121a22]">
            <img
              src={getTourImage(tour, selectedImage)}
              alt={title}
              className="h-[300px] w-full object-cover sm:h-[440px]"
              onError={(event) => {
                if (!event.currentTarget.src.endsWith("/tour-placeholder.svg")) {
                  event.currentTarget.src = "/tour-placeholder.svg";
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {[0, 1].map((index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index + 1)}
                className={`overflow-hidden rounded-2xl border border-white/10 bg-[#121a22] text-left ring-2 transition ${
                  selectedImage === index + 1
                    ? "ring-amber-500"
                    : "ring-transparent hover:ring-amber-500/40"
                }`}
                aria-label={`Show tour image ${index + 2}`}
              >
                <img
                  src={getTourImage(tour, index + 1)}
                  alt={`${title} view ${index + 2}`}
                  className="h-[145px] w-full object-cover transition duration-300 hover:scale-105 sm:h-[212px]"
                  onError={(event) => {
                    if (!event.currentTarget.src.endsWith("/tour-placeholder.svg")) {
                      event.currentTarget.src = "/tour-placeholder.svg";
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </section>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-7">
            <div className="rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-xl sm:p-8">
              <h2 className="text-2xl font-bold text-white">
                About this experience
              </h2>
              <p className="mt-4 whitespace-pre-line leading-8 text-slate-300">
                {tour.description ||
                  "Explore this destination and discover a memorable travel experience."}
              </p>

              <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-[#0b1116] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Destination
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    {destination}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b1116] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Duration
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    {tour.duration
                      ? typeof tour.duration === "number"
                        ? `${tour.duration} hours`
                        : tour.duration
                      : "Check availability"}
                  </p>
                </div>
              </div>
            </div>

            {tour.itineraryDays && tour.itineraryDays.length > 0 && (
              <TourItinerary days={tour.itineraryDays} />
            )}

            {tour.highlights && tour.highlights.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-xl sm:p-8">
                <h2 className="text-2xl font-bold text-white">
                  Highlights
                </h2>
                <ul className="mt-5 space-y-3">
                  {tour.highlights.map((item, index) => (
                    <li key={index} className="flex gap-3 text-slate-300">
                      <span className="font-bold text-amber-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tour.included && tour.included.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-xl sm:p-8">
                <h2 className="text-2xl font-bold text-white">
                  What&apos;s included
                </h2>
                <ul className="mt-5 space-y-3">
                  {tour.included.map((item, index) => (
                    <li key={index} className="flex gap-3 text-slate-300">
                      <span className="font-bold text-amber-400">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section
              id="customer-reviews"
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-xl sm:p-8"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Guest feedback
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Traveller reviews
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Star size={18} fill="currentColor" className="text-amber-400" aria-hidden="true" />
                  <span className="font-bold text-white">
                    {(tour.rating ?? 0).toFixed(1)}
                  </span>
                  <span>·</span>
                  <span>{tour.reviewCount ?? reviews.length} total</span>
                </div>
              </div>

              {reviewsLoading ? (
                <p className="mt-6 text-sm text-slate-400">
                  Loading customer reviews...
                </p>
              ) : reviewsError ? (
                <p role="alert" className="mt-6 text-sm text-rose-400">
                  {reviewsError}
                </p>
              ) : reviews.length === 0 ? (
                <p className="mt-6 rounded-xl border border-white/10 bg-[#0b1116] px-5 py-6 text-center text-sm text-slate-400">
                  No reviews yet. Be the first to share your experience after
                  completing this tour.
                </p>
              ) : (
                <div className="mt-6 divide-y divide-white/10">
                  {reviews.map((review) => {
                    const customerName = [
                      review.user?.name,
                      review.user?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <article key={review._id} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">
                              {customerName || "Wayora traveller"}
                            </h3>
                            <time
                              className="mt-1 block text-xs text-slate-500"
                              dateTime={review.createdAt}
                            >
                              {new Date(review.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </time>
                          </div>
                          <div
                            className="flex gap-0.5 text-amber-400"
                            aria-label={`${review.rating} out of 5 stars`}
                          >
                            {Array.from({ length: 5 }, (_, index) => (
                              <Star
                                key={index}
                                size={16}
                                fill={index < review.rating ? "currentColor" : "none"}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-line leading-7 text-slate-300">
                          {review.comment}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          <aside className="sticky top-24 rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-2xl">
            <p className="text-sm text-slate-400">Starting from</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">
                {validPrice ? formatPrice(price, currency) : "Contact us"}
              </span>
              <span className="text-sm text-slate-400">/ person</span>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="booking-date"
                  className="mb-2 block text-sm font-semibold text-slate-200"
                >
                  Available date
                </label>

                {availabilityLoading ? (
                  <p className="rounded-xl border border-white/10 bg-[#0b1116] p-4 text-sm text-slate-400">
                    Loading available dates...
                  </p>
                ) : availabilityError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-rose-400">
                      {availabilityError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAvailabilityLoading(true);
                        setAvailabilityError("");
                        void fetchAvailability();
                      }}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500 hover:text-slate-950"
                    >
                      Try again
                    </button>
                  </div>
                ) : dates.length === 0 ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                    No available dates at the moment. Please check again later.
                  </p>
                ) : (
                  <select
                    id="booking-date"
                    value={selectedDate}
                    onChange={(event) => handleDateChange(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0b1116] px-4 py-3 text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
                    className="mb-2 block text-sm font-semibold text-slate-200"
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
                    className="w-full rounded-xl border border-white/15 bg-[#0b1116] px-4 py-3 text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-300">
                    {selectedSlot.availableSeats} seats available
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Total capacity: {selectedSlot.totalSeats}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="guests"
                  className="mb-2 block text-sm font-semibold text-slate-200"
                >
                  Number of guests
                </label>
                <select
                  id="guests"
                  value={guests}
                  disabled={!selectedSlot}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-[#0b1116] px-4 py-3 text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
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

              <div className="rounded-xl border border-white/10 bg-[#0b1116] p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">Price per person</span>
                  <span className="font-medium text-slate-100">
                    {validPrice ? formatPrice(price, currency) : "Unavailable"}
                  </span>
                </div>
                <div className="mt-3 flex justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="font-semibold text-slate-200">
                    Estimated total
                  </span>
                  <span className="font-bold text-amber-400">
                    {validPrice
                      ? formatPrice(price * guests, currency)
                      : "Contact us"}
                  </span>
                </div>
              </div>

              {bookingError && (
                <p role="alert" className="text-sm text-rose-400">
                  {bookingError}
                </p>
              )}

              <button
                type="button"
                onClick={handleBooking}
                disabled={
                  submittingBooking ||
                  !validPrice ||
                  availabilityLoading ||
                  !selectedSlot ||
                  guests > (selectedSlot?.availableSeats ?? 0)
                }
                className="w-full rounded-xl bg-amber-500 px-5 py-4 font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingBooking ? "Booking..." : "Book Now →"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Availability is checked again when the booking is submitted.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}