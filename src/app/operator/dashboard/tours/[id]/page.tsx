
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TourImage from "@/components/tours/TourImage";
import TourItinerary from "@/components/tours/TourItinerary";
import type { IItineraryDay } from "@/models/Tour";

type Tour = {
  _id: string;
  title: string;
  destination: string;
  description?: string;
  activityType?: string;
  price: number;
  duration: number;
  durationUnit?: string;
  maxParticipants?: number;
  meetingPoint?: string;
  images?: string[];
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: string[];
  itineraryDays?: IItineraryDay[];
  isActive?: boolean;
};

type Availability = {
  _id: string;
  date: string;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
};

export default function OperatorTourDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTour = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const [tourResponse, availabilityResponse] = await Promise.all([
        fetch(`/api/tours/${encodeURIComponent(id)}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/availability?tourId=${encodeURIComponent(id)}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const tourData = await tourResponse.json();

      if (!tourResponse.ok || tourData.success === false) {
        throw new Error(tourData.message || "Unable to load tour details.");
      }

      const tourValue = tourData.tour ?? tourData.data ?? tourData;
      setTour(tourValue);

      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        const records =
          availabilityData.availability ??
          availabilityData.data ??
          availabilityData;

        setAvailability(Array.isArray(records) ? records : []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTour();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTour]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-64 rounded-2xl bg-gray-200" />
          <div className="h-32 rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (error || !tour) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Unable to load tour
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "Tour not found."}
          </p>
          <button
            onClick={() => void loadTour()}
            className="mt-5 rounded-xl bg-[#087f6e] px-5 py-3 font-semibold text-white"
          >
            Try again
          </button>
          <button
            onClick={() => router.back()}
            className="ml-3 rounded-xl border px-5 py-3 font-semibold"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/operator/dashboard/tours")}
          className="mb-6 text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to My Tours
        </button>

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#087f6e]">
              OPERATOR DASHBOARD / TOURS
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {tour.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-gray-500">{tour.destination}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  tour.isActive === false
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {tour.isActive === false ? "Inactive" : "Active"}
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              router.push(`/operator/dashboard/tours/${tour._id}/edit`)
            }
            className="rounded-xl bg-[#087f6e] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#066354]"
          >
            Edit itinerary
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="relative h-72 w-full sm:h-96">
            <TourImage
              images={tour.images}
              alt={tour.title}
              className="object-cover"
            />
          </div>

          {(tour.images?.length ?? 0) > 1 && (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              {tour.images?.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="relative h-24 overflow-hidden rounded-xl bg-slate-100"
                >
                  <TourImage
                    image={image}
                    images={[image]}
                    alt={`${tour.title} image ${index + 1}`}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Price per person</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹{Number(tour.price).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {tour.duration} {tour.durationUnit || "hours"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Activity type</p>
              <p className="mt-1 font-semibold text-gray-900">
                {tour.activityType || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Maximum participants</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {tour.maxParticipants ?? "Not specified"}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-bold text-gray-900">
                About this tour
              </h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-gray-600">
                {tour.description || "No description added yet."}
              </p>
            </section>

            {tour.itineraryDays && tour.itineraryDays.length > 0 && (
              <TourItinerary days={tour.itineraryDays} />
            )}

            {tour.itinerary && tour.itinerary.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-bold text-gray-900">Itinerary</h2>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-600">
                  {tour.itinerary.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ol>
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-bold text-gray-900">Highlights</h2>
              {tour.highlights?.length ? (
                <ul className="mt-4 space-y-3">
                  {tour.highlights.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-3 text-gray-600">
                      <span className="font-bold text-[#087f6e]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-gray-500">No highlights added.</p>
              )}
            </section>

            <section className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
              <div>
                <h2 className="font-bold text-gray-900">What is included</h2>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {tour.inclusions?.length ? (
                    tour.inclusions.map((item, index) => (
                      <li key={`${item}-${index}`}>✓ {item}</li>
                    ))
                  ) : (
                    <li>Nothing specified yet.</li>
                  )}
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-gray-900">What is excluded</h2>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {tour.exclusions?.length ? (
                    tour.exclusions.map((item, index) => (
                      <li key={`${item}-${index}`}>• {item}</li>
                    ))
                  ) : (
                    <li>Nothing specified yet.</li>
                  )}
                </ul>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="font-bold text-gray-900">Meeting point</h2>
              <p className="mt-3 leading-6 text-gray-600">
                {tour.meetingPoint || "Not specified"}
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-gray-900">Availability</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {availability.length} sessions
                </span>
              </div>

              <button
                onClick={() =>
                  router.push("/operator/dashboard/availability")
                }
                className="mt-4 w-full rounded-xl border border-[#087f6e] px-4 py-3 font-semibold text-[#087f6e] hover:bg-emerald-50"
              >
                Manage Availability
              </button>

              {availability.length ? (
                <div className="mt-5 space-y-4">
                  {availability.map((slot) => (
                    <div
                      key={slot._id}
                      className="rounded-xl bg-gray-50 p-4"
                    >
                      <p className="font-semibold text-gray-900">
                        {new Date(slot.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {slot.startTime}
                        {slot.endTime ? ` – ${slot.endTime}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {slot.availableSeats} of {slot.totalSeats} seats left
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          slot.isAvailable && slot.availableSeats > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {slot.isAvailable && slot.availableSeats > 0
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-gray-500">
                  No availability sessions found for this tour.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
