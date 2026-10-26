
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Tour = {
  _id: string;
  title: string;
  destination?: string;
  price?: number;
};

type Availability = {
  _id: string;
  tour: Tour | string | null;
  date: string;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
};

function getDateString(value: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function AdminAvailabilityPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [tourId, setTourId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [totalSeats, setTotalSeats] = useState("10");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [tourResponse, availabilityResponse] = await Promise.all([
        fetch("/api/tours", { credentials: "include" }),
        fetch("/api/availability", { credentials: "include" }),
      ]);

      const tourResult =
        (await tourResponse.json()) as ApiResponse<Tour[]>;

      const availabilityResult =
        (await availabilityResponse.json()) as ApiResponse<Availability[]>;

      if (!tourResponse.ok || !tourResult.success) {
        throw new Error(tourResult.message || "Could not load tours.");
      }

      if (
        !availabilityResponse.ok ||
        !availabilityResult.success
      ) {
        throw new Error(
          availabilityResult.message || "Could not load availability."
        );
      }

      const tourList = Array.isArray(tourResult.data)
        ? tourResult.data
        : [];

      setTours(tourList);
      setAvailability(
        Array.isArray(availabilityResult.data)
          ? availabilityResult.data
          : []
      );

      setTourId((current) => {
        if (current && tourList.some((tour) => tour._id === current)) {
          return current;
        }
        return tourList[0]?._id || "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!tourId) {
      setError("Please create a tour first.");
      return;
    }

    if (endTime && endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const seats = Number(totalSeats);

    if (!Number.isInteger(seats) || seats < 1) {
      setError("Total seats must be a whole number greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tourId,
          date,
          startTime,
          endTime,
          totalSeats: seats,
        }),
      });

      const result =
        (await response.json()) as ApiResponse<Availability>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not create availability.");
      }

      setSuccess("Availability created successfully!");
      setDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setTotalSeats("10");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create availability."
      );
    } finally {
      setSaving(false);
    }
  }

  function getTourTitle(item: Availability) {
    if (item.tour && typeof item.tour === "object") {
      return item.tour.title || "Tour";
    }
    return "Tour details unavailable";
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-gray-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Availability Management
          </h1>
          <p className="mt-2 text-gray-600">
            Create tour dates and manage the number of available seats.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">Add Availability</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a tour, date, time and seat capacity.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="tourId"
                className="mb-2 block text-sm font-medium"
              >
                Select Tour *
              </label>
              <select
                id="tourId"
                value={tourId}
                onChange={(event) => setTourId(event.target.value)}
                required
                disabled={loading || tours.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Choose a tour</option>
                {tours.map((tour) => (
                  <option key={tour._id} value={tour._id}>
                    {tour.title}
                    {tour.destination ? ` — ${tour.destination}` : ""}
                  </option>
                ))}
              </select>

              {!loading && tours.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  No tours were returned. Create a tour first, and check
                  that the tours API returns tours available for scheduling.
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block text-sm font-medium"
                >
                  Availability Date *
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="totalSeats"
                  className="mb-2 block text-sm font-medium"
                >
                  Total Seats *
                </label>
                <input
                  id="totalSeats"
                  type="number"
                  min="1"
                  step="1"
                  value={totalSeats}
                  onChange={(event) => setTotalSeats(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="startTime"
                  className="mb-2 block text-sm font-medium"
                >
                  Start Time *
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="mb-2 block text-sm font-medium"
                >
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || loading || tours.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Availability"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 sm:p-6">
            <div>
              <h2 className="text-xl font-semibold">Scheduled Availability</h2>
              <p className="mt-1 text-sm text-gray-500">
                Dates and remaining seats returned by the availability API.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-gray-500">Loading availability...</p>
          ) : availability.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">No availability found</p>
              <p className="mt-2 text-sm text-gray-500">
                Create an availability slot using the form above.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl bg-teal-50 p-4">
                  <p className="text-sm text-teal-800">Slots returned</p>
                  <p className="mt-1 text-2xl font-bold text-teal-900">
                    {availability.length}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">Total seats</p>
                  <p className="mt-1 text-2xl font-bold text-blue-900">
                    {availability.reduce(
                      (sum, item) => sum + item.totalSeats,
                      0
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">Seats available</p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {availability.reduce(
                      (sum, item) => sum + item.availableSeats,
                      0
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Tour</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Time</th>
                      <th className="px-5 py-3 font-semibold">Total Seats</th>
                      <th className="px-5 py-3 font-semibold">Available</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {availability.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-medium">
                          {getTourTitle(item)}
                        </td>
                        <td className="px-5 py-4">
                          {getDateString(item.date)}
                        </td>
                        <td className="px-5 py-4">
                          {item.startTime}
                          {item.endTime ? ` - ${item.endTime}` : ""}
                        </td>
                        <td className="px-5 py-4">{item.totalSeats}</td>
                        <td className="px-5 py-4">{item.availableSeats}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isAvailable && item.availableSeats > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.isAvailable && item.availableSeats > 0
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
