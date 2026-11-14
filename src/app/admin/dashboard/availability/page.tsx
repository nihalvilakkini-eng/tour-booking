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
  endDate?: string | null;
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

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default function AdminAvailabilityPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [tourId, setTourId] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [totalSeats, setTotalSeats] = useState("10");
  const [availableSeats, setAvailableSeats] = useState("10");
  const [slotIsAvailable, setSlotIsAvailable] = useState(true);
  const [editing, setEditing] = useState<Availability | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    endDate: "",
    startTime: "09:00",
    endTime: "",
    totalSeats: "10",
    availableSeats: "10",
    isAvailable: true,
  });

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
        fetch("/api/availability?manage=true", { credentials: "include" }),
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
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!tourId) {
      setError("Please create a tour first.");
      return;
    }

    if (!date || !endDate) {
      setError("Starting and ending dates are required.");
      return;
    }

    if (endDate < date) {
      setError("Ending date cannot be before the starting date.");
      return;
    }

    if (endTime && endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const seats = Number(totalSeats);
    const remainingSeats = Number(availableSeats);

    if (!Number.isInteger(seats) || seats < 1) {
      setError("Total seats must be a whole number greater than zero.");
      return;
    }

    if (
      !Number.isInteger(remainingSeats) ||
      remainingSeats < 0 ||
      remainingSeats > seats
    ) {
      setError("Available seats must be between 0 and total seats.");
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
          endDate,
          startTime,
          endTime,
          totalSeats: seats,
          availableSeats: remainingSeats,
          isAvailable: slotIsAvailable,
        }),
      });

      const result =
        (await response.json()) as ApiResponse<Availability>;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not create availability.");
      }

      setSuccess("Availability created successfully!");
      setDate("");
      setEndDate("");
      setStartTime("09:00");
      setEndTime("17:00");
      setTotalSeats("10");
      setAvailableSeats("10");
      setSlotIsAvailable(true);

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

  async function toggleAvailability(item: Availability) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/availability", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityId: item._id,
          isAvailable: !item.isAvailable,
        }),
      });
      const result = (await response.json()) as ApiResponse<Availability>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update availability.");
      }
      setSuccess(
        `Availability ${item.isAvailable ? "deactivated" : "activated"} successfully.`
      );
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update availability."
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditSlot(item: Availability) {
    setEditing(item);
    setEditForm({
      date: toDateInput(item.date),
      endDate: toDateInput(item.endDate || item.date),
      startTime: item.startTime || "09:00",
      endTime: item.endTime || "",
      totalSeats: String(item.totalSeats ?? 1),
      availableSeats: String(item.availableSeats ?? item.totalSeats ?? 1),
      isAvailable: item.isAvailable !== false,
    });
    setError("");
    setSuccess("");
  }

  async function saveEditSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const total = Number(editForm.totalSeats);
    const remaining = Number(editForm.availableSeats);

    if (!editForm.date || !editForm.endDate) {
      setError("Starting and ending dates are required.");
      return;
    }
    if (editForm.endDate < editForm.date) {
      setError("Ending date cannot be before the starting date.");
      return;
    }
    if (editForm.endTime && editForm.endTime <= editForm.startTime) {
      setError("End time must be later than start time.");
      return;
    }
    if (!Number.isInteger(total) || total < 1) {
      setError("Total seats must be a whole number greater than zero.");
      return;
    }
    if (!Number.isInteger(remaining) || remaining < 0 || remaining > total) {
      setError("Available seats must be between 0 and total seats.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/availability", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityId: editing._id,
          date: editForm.date,
          endDate: editForm.endDate,
          startTime: editForm.startTime,
          endTime: editForm.endTime,
          totalSeats: total,
          availableSeats: remaining,
          isAvailable: editForm.isAvailable,
        }),
      });
      const result = (await response.json()) as ApiResponse<Availability>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update availability.");
      }
      setSuccess("Availability updated successfully!");
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update availability."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(item: Availability) {
    if (!window.confirm("Remove this availability slot? Slots with bookings will be deactivated instead.")) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/availability?id=${item._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = (await response.json()) as ApiResponse<Availability>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not remove availability.");
      }
      setSuccess(result.message || "Availability removed successfully!");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove availability."
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
    <main className="min-h-screen bg-[#0b1116] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
            Admin Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Availability Management
          </h1>
          <p className="mt-2 text-slate-400">
            Create tour dates and manage the number of available seats.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-900 bg-emerald-950/50 p-4 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        {/* Add Availability Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-white">Add Availability</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select a tour, date, time and seat capacity.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="tourId"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Select Tour *
              </label>
              <select
                id="tourId"
                value={tourId}
                onChange={(event) => setTourId(event.target.value)}
                required
                disabled={loading || tours.length === 0}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
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
                <p className="mt-2 text-sm text-amber-400">
                  No tours were returned. Create a tour first, and check
                  that the tours API returns tours available for scheduling.
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="date"
                  className="mb-2 block text-sm font-medium text-slate-200"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Ending Date *
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={date || new Date().toLocaleDateString("en-CA")}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>

              <div>
                <label
                  htmlFor="totalSeats"
                  className="mb-2 block text-sm font-medium text-slate-200"
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>

              <div>
                <label
                  htmlFor="availableSeats"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Available Seats *
                </label>
                <input
                  id="availableSeats"
                  type="number"
                  min="0"
                  step="1"
                  value={availableSeats}
                  onChange={(event) => setAvailableSeats(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>

              <div>
                <label
                  htmlFor="startTime"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Start Time *
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={slotIsAvailable}
                onChange={(event) => setSlotIsAvailable(event.target.checked)}
                className="h-4 w-4 accent-teal-500"
              />
              Active availability
            </label>

            <button
              type="submit"
              disabled={saving || loading || tours.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Availability"}
            </button>
          </form>
        </section>

        {/* Scheduled Availability Section */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5 sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Scheduled Availability</h2>
              <p className="mt-1 text-sm text-slate-400">
                Dates and remaining seats returned by the availability API.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-slate-400">Loading availability...</p>
          ) : availability.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-slate-200">No availability found</p>
              <p className="mt-2 text-sm text-slate-400">
                Create an availability slot using the form above.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
                <div className="rounded-xl border border-teal-900/50 bg-teal-950/30 p-4">
                  <p className="text-sm text-teal-400">Slots returned</p>
                  <p className="mt-1 text-2xl font-bold text-teal-200">
                    {availability.length}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-400">Total seats</p>
                  <p className="mt-1 text-2xl font-bold text-blue-200">
                    {availability.reduce(
                      (sum, item) => sum + item.totalSeats,
                      0
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4">
                  <p className="text-sm text-amber-400">Seats available</p>
                  <p className="mt-1 text-2xl font-bold text-amber-200">
                    {availability.reduce(
                      (sum, item) => sum + item.availableSeats,
                      0
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Tour</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Time</th>
                      <th className="px-5 py-3 font-semibold">Total Seats</th>
                      <th className="px-5 py-3 font-semibold">Available</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {availability.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-800/50">
                        <td className="px-5 py-4 font-medium text-white">
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
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {item.isAvailable && item.availableSeats > 0
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditSlot(item)}
                              disabled={saving}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleAvailability(item)}
                              disabled={saving}
                              className="rounded-lg border border-teal-800 bg-teal-950/40 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-900/50 disabled:opacity-50"
                            >
                              {item.isAvailable ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSlot(item)}
                              disabled={saving}
                              className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
              <h2 className="text-xl font-semibold text-white">Edit Availability</h2>
              <p className="mt-1 text-sm text-slate-400">
                {getTourTitle(editing)} — {getDateString(editing.date)}
              </p>

              <form onSubmit={saveEditSlot} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-date">
                      Starting Date *
                    </label>
                    <input
                      id="edit-date"
                      type="date"
                      value={editForm.date}
                      min={new Date().toLocaleDateString("en-CA")}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, date: event.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-endDate">
                      Ending Date *
                    </label>
                    <input
                      id="edit-endDate"
                      type="date"
                      value={editForm.endDate}
                      min={editForm.date || new Date().toLocaleDateString("en-CA")}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, endDate: event.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-startTime">
                      Start Time *
                    </label>
                    <input
                      id="edit-startTime"
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, startTime: event.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-endTime">
                      End Time
                    </label>
                    <input
                      id="edit-endTime"
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, endTime: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-totalSeats">
                      Total Seats *
                    </label>
                    <input
                      id="edit-totalSeats"
                      type="number"
                      min="1"
                      step="1"
                      value={editForm.totalSeats}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, totalSeats: event.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="edit-availableSeats">
                      Available Seats *
                    </label>
                    <input
                      id="edit-availableSeats"
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.availableSeats}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, availableSeats: event.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-900"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={editForm.isAvailable}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, isAvailable: event.target.checked }))
                    }
                    className="h-4 w-4 accent-teal-500"
                  />
                  Active availability
                </label>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    disabled={saving}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}