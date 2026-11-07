"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil, RefreshCw, Search } from "lucide-react";
import TourImage from "@/components/tours/TourImage";

type TourRef = {
  _id?: string;
  title?: string;
  destination?: string;
  images?: string[];
};

type Availability = {
  _id: string;
  tour?: TourRef | string | null;
  date?: string;
  endDate?: string | null;
  startTime?: string;
  endTime?: string;
  totalSeats?: number;
  availableSeats?: number;
  isAvailable?: boolean;
};

type EditForm = {
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalSeats: string;
  availableSeats: string;
  isAvailable: boolean;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tourOf(item: Availability): TourRef | null {
  if (item.tour && typeof item.tour === "object") return item.tour;
  return null;
}

export default function OperatorAvailabilityPage() {
  const [items, setItems] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Availability | null>(null);
  const [form, setForm] = useState<EditForm>({
    date: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
    totalSeats: "10",
    availableSeats: "10",
    isAvailable: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operator/availability", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load availability.");
      }

      setItems(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const tour = tourOf(item);
      return [
        tour?.title,
        tour?.destination,
        item.date,
        item.endDate,
        item.startTime,
        item.endTime,
        item.isAvailable ? "active" : "deactive",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, search]);

  function openEdit(item: Availability) {
    setEditing(item);
    setForm({
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

  async function saveAvailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const totalSeats = Number(form.totalSeats);
    const availableSeats = Number(form.availableSeats);

    if (!form.date || !form.endDate) {
      setError("Starting and ending dates are required.");
      return;
    }

    if (form.endDate < form.date) {
      setError("Ending date cannot be before the starting date.");
      return;
    }

    if (!Number.isInteger(totalSeats) || totalSeats < 1) {
      setError("Total seats must be at least 1.");
      return;
    }

    if (
      !Number.isInteger(availableSeats) ||
      availableSeats < 0 ||
      availableSeats > totalSeats
    ) {
      setError("Available slots must be between 0 and total seats.");
      return;
    }

    if (form.endTime && form.endTime <= form.startTime) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/operator/availability", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityId: editing._id,
          date: form.date,
          endDate: form.endDate,
          startTime: form.startTime,
          endTime: form.endTime,
          totalSeats,
          availableSeats,
          isAvailable: form.isAvailable,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update availability.");
      }

      setSuccess("Availability updated successfully.");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update availability.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Availability Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage dates, time slots, capacity and availability status for your tours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {(error || success) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Tour availability</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${filtered.length} availability record(s)`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tours or dates..."
              className="w-full bg-transparent text-sm outline-none sm:w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading availability...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-semibold text-slate-800">
              No availability records found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Availability records for your tours will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 p-5 xl:grid-cols-2">
            {filtered.map((item) => {
              const tour = tourOf(item);
              const active = item.isAvailable !== false;

              return (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative h-40 w-full shrink-0 sm:h-auto sm:w-40">
                      <TourImage
                        images={tour?.images}
                        alt={tour?.title || "Tour"}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-bold text-slate-900">
                            {tour?.title || "Tour"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {tour?.destination || "Destination not available"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {active ? "Active" : "Deactive"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Starting date
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatDate(item.date)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Ending date
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatDate(item.endDate || item.date)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Time
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {item.startTime || "—"}
                            {item.endTime ? ` - ${item.endTime}` : ""}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Available slots
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {item.availableSeats ?? 0} / {item.totalSeats ?? 0}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="mt-4 flex items-center gap-2 rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        <Pencil size={15} /> Edit Availability
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={saveAvailability}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Availability
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {tourOf(editing)?.title || "Tour availability"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Starting date
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Ending date
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Start time
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                End time
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Total seats
                <input
                  type="number"
                  min="1"
                  required
                  value={form.totalSeats}
                  onChange={(event) => setForm({ ...form, totalSeats: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Available slots
                <input
                  type="number"
                  min="0"
                  required
                  value={form.availableSeats}
                  onChange={(event) => setForm({ ...form, availableSeats: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })}
                  className="h-4 w-4 accent-teal-700"
                />
                Active availability
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
