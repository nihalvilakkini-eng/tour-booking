
"use client";

import {
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
  }, [tourId]);

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
      router.push("/operator/tours");
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
            href="/operator/tours"
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
            href="/operator/tours"
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
                  min="0"
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
              href="/operator/tours"
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
    </main>
  );
}
