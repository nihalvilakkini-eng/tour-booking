
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import TourItineraryBuilder, {
  appendItineraryToFormData,
  toEditableItinerary,
  type EditableItineraryDay,
} from "@/components/forms/TourItineraryBuilder";

type TourForm = {
  title: string;
  description: string;
  destination: string;
  activityType: string;
  duration: string;
  durationUnit: "hours" | "days";
  price: string;
  currency: string;
  maxParticipants: string;
  meetingPoint: string;
  itinerary: string;
  highlights: string;
  inclusions: string;
  exclusions: string;
};

type TourData = {
  _id: string;
  title: string;
  description: string;
  destination: string;
  activityType: string;
  duration: number;
  durationUnit: "hours" | "days";
  price: number;
  currency: string;
  maxParticipants: number;
  meetingPoint: string;
  itinerary?: string[];
  itineraryDays?: Parameters<typeof toEditableItinerary>[0];
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  images?: string[];
};

type AvailabilityItem = {
  _id: string;
  tour?: string | { _id?: string };
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  totalSeats?: number;
  availableSeats?: number;
  isAvailable?: boolean;
};

type AvailabilityForm = {
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalSeats: string;
  availableSeats: string;
  isAvailable: boolean;
};

const emptyAvailabilityForm: AvailabilityForm = {
  date: "",
  endDate: "",
  startTime: "",
  endTime: "",
  totalSeats: "",
  availableSeats: "",
  isAvailable: true,
};

function toDateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAvailabilityDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

const initialForm: TourForm = {
  title: "",
  description: "",
  destination: "",
  activityType: "",
  duration: "1",
  durationUnit: "hours",
  price: "",
  currency: "INR",
  maxParticipants: "10",
  meetingPoint: "",
  itinerary: "",
  highlights: "",
  inclusions: "",
  exclusions: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClass = "block text-sm font-semibold text-slate-700";

function listToText(items?: string[]) {
  return (items ?? []).join("\n");
}

function appendList(data: FormData, field: string, value: string) {
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => data.append(field, item));
}

export default function EditTourPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tourId = params.id;

  const [form, setForm] = useState<TourForm>(initialForm);
  const [itineraryDays, setItineraryDays] = useState<EditableItineraryDay[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [editingAvailability, setEditingAvailability] =
    useState<AvailabilityItem | null>(null);
  const [creatingAvailability, setCreatingAvailability] = useState(false);
  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<
    string | null
  >(null);
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>(
    emptyAvailabilityForm
  );

  const loadAvailability = useCallback(async () => {
    if (!tourId) return;

    try {
      setAvailabilityLoading(true);
      setAvailabilityError("");

      const response = await fetch("/api/operator/availability", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setAvailabilities([]);
        setAvailabilityError(
          response.status === 403
            ? "Availability is managed by the assigned operator."
            : result?.message || "Unable to load availability"
        );
        return;
      }

      const items = ((result.data as AvailabilityItem[]) || []).filter(
        (item) => {
          const tourRef = item.tour;
          const tourRefId =
            typeof tourRef === "string" ? tourRef : tourRef?._id;
          return tourRefId === tourId;
        }
      );

      setAvailabilities(items);
    } catch {
      setAvailabilities([]);
      setAvailabilityError("Unable to load availability");
    } finally {
      setAvailabilityLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    if (!tourId) return;

    let cancelled = false;

    async function loadTour() {
      try {
        setLoading(true);
        const response = await fetch(`/api/tours/${tourId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load tour");
        }

        if (cancelled) return;

        const tour = result.data as TourData;

        setForm({
          title: tour.title || "",
          description: tour.description || "",
          destination: tour.destination || "",
          activityType: tour.activityType || "",
          duration: String(tour.duration ?? 1),
          durationUnit: tour.durationUnit || "hours",
          price: String(tour.price ?? ""),
          currency: tour.currency || "INR",
          maxParticipants: String(tour.maxParticipants ?? 10),
          meetingPoint: tour.meetingPoint || "",
          itinerary: listToText(tour.itinerary),
          highlights: listToText(tour.highlights),
          inclusions: listToText(tour.inclusions),
          exclusions: listToText(tour.exclusions),
        });

        setItineraryDays(toEditableItinerary(tour.itineraryDays));
        setExistingImages(tour.images ?? []);
        void loadAvailability();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load tour"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTour();

    return () => {
      cancelled = true;
    };
  }, [tourId, loadAvailability]);

  function updateField<K extends keyof TourForm>(
    field: K,
    value: TourForm[K]
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selected.length === 0) return;

    const validFiles: File[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not an image file.`);
        continue;
      }

      if (file.size === 0 || file.size > 10 * 1024 * 1024) {
        setError(`${file.name} must be under 10MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (existingImages.length + newImages.length + validFiles.length > 10) {
      setError("Maximum 10 tour photos are allowed.");
      return;
    }

    setError("");
    setNewImages((previous) => [...previous, ...validFiles]);
  }

  function removeNewImage(index: number) {
    setNewImages((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function openAvailabilityCreate() {
    setAvailabilityMessage("");
    setAvailabilityError("");
    setEditingAvailability(null);
    setCreatingAvailability(true);
    setAvailabilityForm(emptyAvailabilityForm);
  }

  function openAvailabilityEdit(item: AvailabilityItem) {
    setAvailabilityMessage("");
    setAvailabilityError("");
    setCreatingAvailability(false);
    setEditingAvailability(item);
    setAvailabilityForm({
      date: toDateInput(item.date),
      endDate: toDateInput(item.endDate || item.date),
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      totalSeats: String(item.totalSeats ?? ""),
      availableSeats: String(item.availableSeats ?? ""),
      isAvailable: item.isAvailable !== false,
    });
  }

  function closeAvailabilityModal() {
    setEditingAvailability(null);
    setCreatingAvailability(false);
    setAvailabilityForm(emptyAvailabilityForm);
    setAvailabilityError("");
  }

  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvailabilityMessage("");
    setAvailabilityError("");

    const totalSeats = Number(availabilityForm.totalSeats);
    const availableSeats = Number(availabilityForm.availableSeats);

    if (
      !availabilityForm.date ||
      !availabilityForm.startTime ||
      !Number.isInteger(totalSeats) ||
      totalSeats < 1 ||
      !Number.isInteger(availableSeats) ||
      availableSeats < 0 ||
      availableSeats > totalSeats
    ) {
      setAvailabilityError("Please complete the availability fields correctly.");
      return;
    }

    setAvailabilitySaving(true);

    try {
      const payload = {
        date: availabilityForm.date,
        endDate: availabilityForm.endDate || availabilityForm.date,
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        totalSeats,
        availableSeats,
        isAvailable: availabilityForm.isAvailable,
        ...(editingAvailability
          ? { availabilityId: editingAvailability._id }
          : { tourId }),
      };

      const response = await fetch("/api/operator/availability", {
        method: editingAvailability ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to save availability");
      }

      setAvailabilityMessage(
        editingAvailability ? "Availability updated." : "Availability created."
      );
      setAvailabilityError("");
      closeAvailabilityModal();
      await loadAvailability();
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : "Unable to save availability"
      );
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function toggleAvailability(item: AvailabilityItem) {
    setAvailabilityMessage("");
    setAvailabilityError("");
    setTogglingAvailabilityId(item._id);
    const nextValue = item.isAvailable === false;

    try {
      const response = await fetch("/api/operator/availability", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          availabilityId: item._id,
          isAvailable: nextValue,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Unable to update availability");
      }

      setAvailabilityMessage(
        nextValue ? "Availability activated." : "Availability deactivated."
      );
      setAvailabilityError("");
      await loadAvailability();
    } catch (err) {
      setAvailabilityError(
        err instanceof Error ? err.message : "Unable to update availability"
      );
    } finally {
      setTogglingAvailabilityId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.destination.trim() ||
      !form.activityType.trim() ||
      !form.meetingPoint.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      existingImages.length + newImages.length > 10
    ) {
      setError("Maximum 10 tour photos are allowed.");
      return;
    }

    const duration = Number(form.duration);
    const price = Number(form.price);
    const maxParticipants = Number(form.maxParticipants);

    if (!Number.isFinite(duration) || duration < 1) {
      setError("Duration must be at least 1.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Tour price must be greater than zero.");
      return;
    }

    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      setError("Maximum participants must be at least 1.");
      return;
    }

    const data = new FormData();

    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("destination", form.destination.trim());
    data.append("activityType", form.activityType.trim());
    data.append("duration", form.duration);
    data.append("durationUnit", form.durationUnit);
    data.append("price", form.price);
    data.append("currency", form.currency);
    data.append("maxParticipants", form.maxParticipants);
    data.append("meetingPoint", form.meetingPoint.trim());

    appendList(data, "itinerary", form.itinerary);
    appendList(data, "highlights", form.highlights);
    appendList(data, "inclusions", form.inclusions);
    appendList(data, "exclusions", form.exclusions);

    // Preserve existing tour photos.
    existingImages.forEach((url) => {
      data.append("existingImages", url);
    });

    // Add newly selected tour photos.
    newImages.forEach((file) => {
      data.append("images", file);
    });

    // Preserve and update itinerary activities and activity images.
    appendItineraryToFormData(data, itineraryDays);

    try {
      setSaving(true);

      const response = await fetch(`/api/tours/${tourId}`, {
        method: "PATCH",
        credentials: "include",
        body: data,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update tour");
      }

      setSuccess("Tour updated successfully!");

      // Refresh the operator's tour list after saving.
      router.push("/operator/dashboard/tours");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update tour"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="text-sm font-medium text-slate-600">
          Loading tour details...
        </p>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-semibold text-rose-700">{error}</p>
          <Link
            href="/operator/dashboard/tours"
            className="mt-4 inline-block text-sm font-bold text-emerald-700 hover:underline"
          >
            Back to My Tours
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Operator dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Edit Tour
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Update your tour information, photos and itinerary.
            </p>
          </div>

          <Link
            href="/operator/dashboard/tours"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Basic Information
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Tour title *
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                Description *
                <textarea
                  className={inputClass}
                  rows={5}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                />
              </label>

              <label className={labelClass}>
                Destination *
                <input
                  className={inputClass}
                  value={form.destination}
                  onChange={(e) => updateField("destination", e.target.value)}
                  required
                />
              </label>

              <label className={labelClass}>
                Activity type *
                <input
                  className={inputClass}
                  value={form.activityType}
                  onChange={(e) => updateField("activityType", e.target.value)}
                  required
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                Meeting point *
                <input
                  className={inputClass}
                  value={form.meetingPoint}
                  onChange={(e) => updateField("meetingPoint", e.target.value)}
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Price, Duration & Capacity
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                Duration *
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  required
                />
              </label>

              <label className={labelClass}>
                Duration unit *
                <select
                  className={inputClass}
                  value={form.durationUnit}
                  onChange={(e) =>
                    updateField("durationUnit", e.target.value as "hours" | "days")
                  }
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </label>

              <label className={labelClass}>
                Price *
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  required
                />
              </label>

              <label className={labelClass}>
                Currency
                <select
                  className={inputClass}
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                </select>
              </label>

              <label className={labelClass}>
                Maximum participants *
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.maxParticipants}
                  onChange={(e) =>
                    updateField("maxParticipants", e.target.value)
                  }
                  required
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Tour Photos
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Keep existing photos, remove unwanted ones or add new photos.
              Maximum 10 photos, 10MB each.
            </p>

            {existingImages.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {existingImages.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Existing tour photo ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExistingImages((previous) =>
                          previous.filter((_, i) => i !== index)
                        )
                      }
                      className="absolute right-2 top-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={`${labelClass} mt-6`}>
              Add new photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelection}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:font-semibold file:text-emerald-800"
              />
            </label>

            {newImages.length > 0 && (
              <div className="mt-4 space-y-2">
                {newImages.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-slate-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="shrink-0 font-semibold text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              {existingImages.length + newImages.length} / 10 photos selected
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Availability
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Manage dates, times, seats and active status for this tour.
                </p>
              </div>
              <button
                type="button"
                onClick={openAvailabilityCreate}
                className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Add availability
              </button>
            </div>

            {availabilityMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                {availabilityMessage}
              </div>
            )}

            {availabilityError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {availabilityError}
              </div>
            )}

            {availabilityLoading ? (
              <p className="mt-5 text-sm text-slate-500">Loading availability...</p>
            ) : availabilities.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                No availability slots yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {availabilities.map((item) => {
                  const active = item.isAvailable !== false;
                  return (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {formatAvailabilityDate(item.date)}
                          {item.endDate && item.endDate !== item.date
                            ? ` - ${formatAvailabilityDate(item.endDate)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.startTime || "—"}
                          {item.endTime ? ` - ${item.endTime}` : ""} ·{" "}
                          {item.availableSeats ?? 0}/{item.totalSeats ?? 0}{" "}
                          slots · {active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleAvailability(item)}
                          disabled={togglingAvailabilityId === item._id}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                            active
                              ? "border border-rose-200 bg-rose-50 text-rose-700"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {togglingAvailabilityId === item._id
                            ? "Saving..."
                            : active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openAvailabilityEdit(item)}
                          className="rounded-lg border border-teal-700 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <TourItineraryBuilder
            days={itineraryDays}
            onChange={setItineraryDays}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Additional Details
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                Highlights
                <textarea
                  className={inputClass}
                  rows={4}
                  placeholder="Enter one item per line"
                  value={form.highlights}
                  onChange={(e) => updateField("highlights", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Simple itinerary
                <textarea
                  className={inputClass}
                  rows={4}
                  placeholder="Enter one item per line"
                  value={form.itinerary}
                  onChange={(e) => updateField("itinerary", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Inclusions
                <textarea
                  className={inputClass}
                  rows={4}
                  placeholder="Enter one item per line"
                  value={form.inclusions}
                  onChange={(e) => updateField("inclusions", e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Exclusions
                <textarea
                  className={inputClass}
                  rows={4}
                  placeholder="Enter one item per line"
                  value={form.exclusions}
                  onChange={(e) => updateField("exclusions", e.target.value)}
                />
              </label>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/operator/dashboard/tours"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update Tour"}
            </button>
          </div>
        </form>
      </div>

      {(editingAvailability || creatingAvailability) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={saveAvailability}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {creatingAvailability ? "Add Availability" : "Edit Availability"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {creatingAvailability
                    ? "Create a new slot for this tour"
                    : "Update this availability slot"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAvailabilityModal}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Starting date
                <input
                  type="date"
                  required
                  className={inputClass}
                  value={availabilityForm.date}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, date: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Ending date
                <input
                  type="date"
                  required
                  className={inputClass}
                  value={availabilityForm.endDate}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, endDate: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Start time
                <input
                  type="time"
                  required
                  className={inputClass}
                  value={availabilityForm.startTime}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, startTime: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                End time
                <input
                  type="time"
                  className={inputClass}
                  value={availabilityForm.endTime}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, endTime: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Total seats
                <input
                  type="number"
                  min="1"
                  required
                  className={inputClass}
                  value={availabilityForm.totalSeats}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, totalSeats: event.target.value })
                  }
                />
              </label>
              <label className={labelClass}>
                Available slots
                <input
                  type="number"
                  min="0"
                  required
                  className={inputClass}
                  value={availabilityForm.availableSeats}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, availableSeats: event.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={availabilityForm.isAvailable}
                  onChange={(event) =>
                    setAvailabilityForm({ ...availabilityForm, isAvailable: event.target.checked })
                  }
                  className="h-4 w-4 accent-teal-700"
                />
                Active availability
              </label>
            </div>

            {availabilityError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {availabilityError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeAvailabilityModal}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={availabilitySaving}
                className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {availabilitySaving
                  ? "Saving..."
                  : creatingAvailability
                    ? "Create Availability"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
