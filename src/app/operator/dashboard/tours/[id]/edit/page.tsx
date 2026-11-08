"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TourItineraryBuilder, {
  appendItineraryToFormData,
  toEditableItinerary,
  type EditableItineraryDay,
} from "@/components/forms/TourItineraryBuilder";
import type { IItineraryDay } from "@/models/Tour";

type TourResponse = {
  success?: boolean;
  message?: string;
  data?: {
    _id?: string;
    title?: string;
    itineraryDays?: IItineraryDay[];
  };
};

export default function EditTourItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<EditableItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    async function loadTour() {
      try {
        const response = await fetch(
          `/api/tours/${encodeURIComponent(id)}`,
          { cache: "no-store", credentials: "include", signal: controller.signal }
        );
        const result = (await response.json()) as TourResponse;
        if (!response.ok || result.success !== true || !result.data) {
          throw new Error(result.message || "Unable to load this tour.");
        }

        setTitle(result.data.title || "Tour");
        setDays(toEditableItinerary(result.data.itineraryDays));
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this tour."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTour();
    return () => controller.abort();
  }, [id]);

  async function saveItinerary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      appendItineraryToFormData(formData, days);
      const response = await fetch(
        `/api/tours/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          credentials: "include",
          body: formData,
        }
      );
      const result = (await response.json()) as TourResponse;
      if (!response.ok || result.success !== true) {
        if (response.status === 401) {
          throw new Error("Please sign in again to update this tour.");
        }
        if (response.status === 403) {
          throw new Error("You can only edit your own tours.");
        }
        throw new Error(result.message || "Unable to save the itinerary.");
      }

      router.push(`/operator/dashboard/tours/${encodeURIComponent(id)}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the itinerary."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-[60vh] bg-[#f5f8f7] px-4 py-12">
        <p className="mx-auto max-w-5xl animate-pulse text-sm text-slate-500">
          Loading tour itinerary...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/operator/dashboard/tours/${encodeURIComponent(id)}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Back to {title}
        </Link>
        <header className="my-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Operator dashboard / Tour itinerary
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Edit {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Update the day-by-day plan, activity order, locations, and roadmap.
          </p>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </p>
        )}

        <form onSubmit={saveItinerary} className="space-y-6">
          <TourItineraryBuilder days={days} onChange={setDays} />
          <div className="flex flex-col-reverse justify-end gap-3 pb-8 sm:flex-row">
            <Link
              href={`/operator/dashboard/tours/${encodeURIComponent(id)}`}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving itinerary..." : "Save itinerary"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
