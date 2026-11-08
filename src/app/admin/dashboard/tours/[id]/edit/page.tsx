"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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

type Availability = {
  _id: string;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
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
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
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

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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

export default function AdminEditTourPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tourId = params.id;

  const [form, setForm] = useState<TourForm>(initialForm);
  const [itineraryDays, setItineraryDays] = useState<EditableItineraryDay[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [slotForm, setSlotForm] = useState({
    date: "",
    endDate: "",
    startTime: "09:00",
    endTime: "",
    totalSeats: "10",
    availableSeats: "10",
    isAvailable: true,
  });
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null);
  const [showSlotForm, setShowSlotForm] = useState(false);

  useEffect(() => {
    if (!tourId) return;
    let cancelled = false;

    async function loadTour() {
      try {
        setLoading(true);
        const response = await fetch(`/api/tours/${tourId}`, {
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
          setError(err instanceof Error ? err.message : "Unable to load tour");
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

  const loadAvailability = async () => {
    if (!tourId) return;
    setAvailabilityLoading(true);
    try {
      const response = await fetch(
        `/api/availability?manage=true&tourId=${tourId}`,
        { credentials: "include", cache: "no-store" }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load availability");
      }
      setAvailability(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !tourId) return;

    const timeout = window.setTimeout(() => {
      void loadAvailability();
    }, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, tourId]);

  function updateField<K extends keyof TourForm>(field: K, value: TourForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;
    const validFiles: File[] = [];
    for (const file of selected) {
      if (!file.type.startsWith("image/") || file.size === 0 || file.size > 10 * 1024 * 1024) {
        setError(`${file.name} must be an image under 10MB.`);
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
    setNewImages((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim() || !form.description.trim() || !form.destination.trim() || !form.activityType.trim() || !form.meetingPoint.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    if (existingImages.length + newImages.length > 10) {
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
    existingImages.forEach((url) => data.append("existingImages", url));
    newImages.forEach((file) => data.append("images", file));
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
      router.push("/admin/dashboard/tours");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tour");
    } finally {
      setSaving(false);
    }
  }

  function startAddSlot() {
    setEditingSlot(null);
    setShowSlotForm(true);
    setSlotForm({
      date: "",
      endDate: "",
      startTime: "09:00",
      endTime: "",
      totalSeats: "10",
      availableSeats: "10",
      isAvailable: true,
    });
    setError("");
  }

  function startEditSlot(slot: Availability) {
    setEditingSlot(slot);
    setShowSlotForm(true);
    setSlotForm({
      date: toDateInput(slot.date),
      endDate: toDateInput(slot.endDate || slot.date),
      startTime: slot.startTime || "09:00",
      endTime: slot.endTime || "",
      totalSeats: String(slot.totalSeats ?? 1),
      availableSeats: String(slot.availableSeats ?? slot.totalSeats ?? 1),
      isAvailable: slot.isAvailable !== false,
    });
    setError("");
  }

  async function saveSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalSeats = Number(slotForm.totalSeats);
    const availableSeats = Number(slotForm.availableSeats);
    if (!slotForm.date) {
      setError("Availability date is required.");
      return;
    }
    if (slotForm.endDate && slotForm.endDate < slotForm.date) {
      setError("Ending date cannot be before the starting date.");
      return;
    }
    if (!Number.isInteger(totalSeats) || totalSeats < 1) {
      setError("Total seats must be at least 1.");
      return;
    }
    if (!Number.isInteger(availableSeats) || availableSeats < 0 || availableSeats > totalSeats) {
      setError("Available seats must be between 0 and total seats.");
      return;
    }
    if (slotForm.endTime && slotForm.endTime <= slotForm.startTime) {
      setError("End time must be after start time.");
      return;
    }

    setAvailabilityLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        date: slotForm.date,
        endDate: slotForm.endDate || slotForm.date,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        totalSeats,
        availableSeats,
        isAvailable: slotForm.isAvailable,
      };
      if (editingSlot) payload.availabilityId = editingSlot._id;

      const response = await fetch("/api/availability", {
        method: editingSlot ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingSlot
            ? payload
            : { ...payload, tourId }
        ),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save availability");
      }
      setEditingSlot(null);
      setShowSlotForm(false);
      await loadAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save availability");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function toggleSlot(slot: Availability) {
    setAvailabilityLoading(true);
    setError("");
    try {
      const response = await fetch("/api/availability", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityId: slot._id,
          isAvailable: !slot.isAvailable,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update availability");
      }
      await loadAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update availability");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function removeSlot(slot: Availability) {
    if (!window.confirm("Remove this availability slot?")) return;
    setAvailabilityLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/availability?id=${slot._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to remove availability");
      }
      await loadAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove availability");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="text-sm font-medium text-slate-600">Loading tour details...</p>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-semibold text-rose-700">{error}</p>
          <Link href="/admin/dashboard/tours" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline">
            Back to Tours
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Admin dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Edit Tour</h1>
            <p className="mt-2 text-sm text-slate-500">Update tour information, photos, itinerary and availability.</p>
          </div>
          <Link href="/admin/dashboard/tours" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Tour title *
                <input className={inputClass} value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Description *
                <textarea className={inputClass} rows={5} value={form.description} onChange={(e) => updateField("description", e.target.value)} required />
              </label>
              <label className={labelClass}>
                Destination *
                <input className={inputClass} value={form.destination} onChange={(e) => updateField("destination", e.target.value)} required />
              </label>
              <label className={labelClass}>
                Activity type *
                <input className={inputClass} value={form.activityType} onChange={(e) => updateField("activityType", e.target.value)} required />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Meeting point *
                <input className={inputClass} value={form.meetingPoint} onChange={(e) => updateField("meetingPoint", e.target.value)} required />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">Price, Duration & Capacity</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>Duration *<input type="number" min="1" className={inputClass} value={form.duration} onChange={(e) => updateField("duration", e.target.value)} required /></label>
              <label className={labelClass}>Duration unit *
                <select className={inputClass} value={form.durationUnit} onChange={(e) => updateField("durationUnit", e.target.value as "hours" | "days")}>
                  <option value="hours">Hours</option><option value="days">Days</option>
                </select>
              </label>
              <label className={labelClass}>Price *<input type="number" min="0.01" step="0.01" className={inputClass} value={form.price} onChange={(e) => updateField("price", e.target.value)} required /></label>
              <label className={labelClass}>Currency
                <select className={inputClass} value={form.currency} onChange={(e) => updateField("currency", e.target.value)}>
                  <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AED">AED</option>
                </select>
              </label>
              <label className={labelClass}>Maximum participants *<input type="number" min="1" className={inputClass} value={form.maxParticipants} onChange={(e) => updateField("maxParticipants", e.target.value)} required /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">Tour Photos</h2>
            <p className="mt-2 text-sm text-slate-500">Keep existing photos, remove unwanted ones or add new photos. Maximum 10 photos, 10MB each.</p>
            {existingImages.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {existingImages.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Existing tour photo ${index + 1}`} className="h-36 w-full object-cover" />
                    <button type="button" onClick={() => setExistingImages((previous) => previous.filter((_, i) => i !== index))} className="absolute right-2 top-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <label className={`${labelClass} mt-6`}>
              Add new photos
              <input type="file" accept="image/*" multiple onChange={handleImageSelection} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2.5 file:font-semibold file:text-teal-800" />
            </label>
            {newImages.length > 0 && (
              <div className="mt-4 space-y-2">
                {newImages.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate text-slate-700">{file.name}</span>
                    <button type="button" onClick={() => removeNewImage(index)} className="shrink-0 font-semibold text-rose-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">{existingImages.length + newImages.length} / 10 photos selected</p>
          </section>

          <TourItineraryBuilder days={itineraryDays} onChange={setItineraryDays} />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Availability</h2>
                <p className="mt-1 text-sm text-slate-500">Manage bookable date slots for this tour.</p>
              </div>
              <button type="button" onClick={startAddSlot} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">+ Add Slot</button>
            </div>
            {availabilityLoading && availability.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Loading availability...</p>
            ) : availability.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No availability slots yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {availability.map((slot) => (
                  <div key={slot._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{formatDate(slot.date)}{slot.endDate && slot.endDate !== slot.date ? ` - ${formatDate(slot.endDate)}` : ""}</p>
                      <p className="mt-1 text-sm text-slate-500">{slot.startTime}{slot.endTime ? ` - ${slot.endTime}` : ""} • {slot.availableSeats}/{slot.totalSeats} seats</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${slot.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{slot.isAvailable ? "Active" : "Deactive"}</span>
                      <button type="button" onClick={() => startEditSlot(slot)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={() => void toggleSlot(slot)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">{slot.isAvailable ? "Deactivate" : "Activate"}</button>
                      <button type="button" onClick={() => void removeSlot(slot)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">Additional Details</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {([["highlights","Highlights","Scenic views\nLocal guide"],["itinerary","Simple itinerary","Arrival\nTour\nReturn"],["inclusions","Inclusions","Guide\nTickets"],["exclusions","Exclusions","Meals\nTransport"]] as const).map(([field,label,placeholder]) => (
                <label key={field} className={labelClass}>
                  {label}
                  <textarea className={inputClass} rows={4} placeholder={placeholder} value={form[field]} onChange={(e) => updateField(field, e.target.value)} />
                </label>
              ))}
            </div>
          </section>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{success}</div>}

          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/admin/dashboard/tours" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</Link>
            <button type="submit" disabled={saving} className="rounded-xl bg-teal-700 px-7 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Updating..." : "Update Tour"}</button>
          </div>
        </form>
      </div>

      {showSlotForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveSlot} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingSlot ? "Edit Availability" : "Add Availability"}</h2>
              <button type="button" onClick={() => { setEditingSlot(null); setShowSlotForm(false); }} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Starting date<input type="date" required value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="text-sm font-semibold text-slate-700">Ending date<input type="date" value={slotForm.endDate} onChange={(e) => setSlotForm({ ...slotForm, endDate: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="text-sm font-semibold text-slate-700">Start time<input type="time" required value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="text-sm font-semibold text-slate-700">End time<input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="text-sm font-semibold text-slate-700">Total seats<input type="number" min="1" required value={slotForm.totalSeats} onChange={(e) => setSlotForm({ ...slotForm, totalSeats: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="text-sm font-semibold text-slate-700">Available seats<input type="number" min="0" required value={slotForm.availableSeats} onChange={(e) => setSlotForm({ ...slotForm, availableSeats: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600" /></label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={slotForm.isAvailable} onChange={(e) => setSlotForm({ ...slotForm, isAvailable: e.target.checked })} className="h-4 w-4 accent-teal-700" />
                Active availability
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => { setEditingSlot(null); setShowSlotForm(false); }} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={availabilityLoading} className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{availabilityLoading ? "Saving..." : "Save Slot"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
