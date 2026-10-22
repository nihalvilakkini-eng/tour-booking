"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Plus } from "lucide-react";

export default function OperatorTourCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/operator/tours", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result: { success?: boolean; message?: string } =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create tour.");
      }

      router.push("/operator/dashboard/tours");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create tour."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/operator/dashboard/tours"
        className="inline-flex items-center gap-2 text-sm text-teal-700"
      >
        <ArrowLeft size={17} /> Back to My Tours
      </Link>

      <header>
        <h1 className="text-3xl font-bold text-slate-900">Create New Tour</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add the details of your tour or activity.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      >
        <div className="flex items-center gap-3 border-b pb-5">
          <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
            <MapPin size={23} />
          </span>
          <div>
            <h2 className="font-bold">Tour Information</h2>
            <p className="text-sm text-slate-500">
              Tell travellers about your experience.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Tour title *
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="e.g. Munnar Tea Garden Trip"
            className="w-full rounded-xl border p-3 outline-none focus:border-teal-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="destination" className="text-sm font-medium">
            Destination *
          </label>
          <input
            id="destination"
            name="destination"
            required
            placeholder="e.g. Munnar, Kerala"
            className="w-full rounded-xl border p-3 outline-none focus:border-teal-600"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price (₹) *
            </label>
            <input
              id="price"
              type="number"
              name="price"
              required
              min="0"
              step="0.01"
              placeholder="2500"
              className="w-full rounded-xl border p-3 outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duration *
            </label>
            <div className="flex gap-2">
              <input
                id="duration"
                type="number"
                name="duration"
                required
                min="1"
                step="1"
                placeholder="2"
                className="min-w-0 flex-1 rounded-xl border p-3 outline-none focus:border-teal-600"
              />
              <select
                name="durationUnit"
                aria-label="Duration unit"
                className="rounded-xl border bg-white p-3 outline-none focus:border-teal-600"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="activityType" className="text-sm font-medium">
              Activity type *
            </label>
            <select
              id="activityType"
              name="activityType"
              required
              className="w-full rounded-xl border bg-white p-3 outline-none focus:border-teal-600"
            >
              <option value="">Choose an activity</option>
              <option value="adventure">Adventure</option>
              <option value="nature">Nature</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="cultural">Cultural</option>
              <option value="water">Water activities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="maxParticipants" className="text-sm font-medium">
              Maximum participants *
            </label>
            <input
              id="maxParticipants"
              type="number"
              name="maxParticipants"
              required
              min="1"
              step="1"
              defaultValue="10"
              className="w-full rounded-xl border p-3 outline-none focus:border-teal-600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="meetingPoint" className="text-sm font-medium">
            Meeting point *
          </label>
          <input
            id="meetingPoint"
            name="meetingPoint"
            required
            placeholder="e.g. Munnar town center"
            className="w-full rounded-xl border p-3 outline-none focus:border-teal-600"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="Describe the tour, highlights and what guests can expect..."
            className="w-full resize-y rounded-xl border p-3 outline-none focus:border-teal-600"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse justify-end gap-3 border-t pt-5 sm:flex-row">
          <Link
            href="/operator/dashboard/tours"
            className="rounded-xl border px-5 py-3 text-center text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={18} /> {submitting ? "Creating..." : "Create Tour"}
          </button>
        </div>
      </form>
    </div>
  );
}
