
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

const initialForm = {
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

function splitList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminCreateTourPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(
    field: keyof typeof initialForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (images.length > 10) {
      setError("You can upload a maximum of 10 images.");
      return;
    }

    if (
      images.some(
        (image) =>
          !image.type.startsWith("image/") ||
          image.size === 0 ||
          image.size > 10 * 1024 * 1024
      )
    ) {
      setError(
        "Choose valid image files. Each image must be smaller than 10 MB."
      );
      return;
    }

    const duration = Number(form.duration);
    const price = Number(form.price);
    const maxParticipants = Number(form.maxParticipants);

    if (!Number.isFinite(duration) || duration < 1) {
      setError("Duration must be at least 1.");
      return;
    }

    if (!Number.isFinite(price) || price < 0 || !form.price.trim()) {
      setError("Enter a valid tour price.");
      return;
    }

    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      setError("Maximum participants must be at least 1.");
      return;
    }

    if (form.durationUnit !== "hours" && form.durationUnit !== "days") {
      setError("Choose a valid duration unit.");
      return;
    }

    const data = new FormData();

    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("destination", form.destination.trim());
    data.append("activityType", form.activityType.trim());
    data.append("duration", String(duration));
    data.append("durationUnit", form.durationUnit);
    data.append("price", String(price));
    data.append("currency", form.currency);
    data.append("maxParticipants", String(maxParticipants));
    data.append("meetingPoint", form.meetingPoint.trim());

    const listFields = [
      "itinerary",
      "highlights",
      "inclusions",
      "exclusions",
    ] as const;

    for (const field of listFields) {
      for (const item of splitList(form[field])) {
        data.append(field, item);
      }
    }

    for (const image of images) {
      data.append("images", image);
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tours", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not create the tour.");
      }

      setSuccess("Tour created successfully!");
      setForm(initialForm);
      setImages([]);

      // Return to the Admin Tours page after a short delay.
      window.setTimeout(() => {
        router.push("/admin/dashboard/tours");
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the tour."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to Admin Dashboard
        </button>

        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#087f6e]">
            WAYORA Admin
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Create a New Tour
          </h1>
          <p className="mt-3 text-gray-600">
            Add tour information, pricing, activities and images.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <section>
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              1. Basic Information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="title">
                  Tour Title *
                </label>
                <input
                  id="title"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Example: Munnar Tea Garden Adventure"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="description">
                  Description *
                </label>
                <textarea
                  id="description"
                  className={inputClass}
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="Describe the tour and what visitors can expect..."
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="destination">
                  Destination *
                </label>
                <input
                  id="destination"
                  className={inputClass}
                  value={form.destination}
                  onChange={(e) =>
                    updateField("destination", e.target.value)
                  }
                  placeholder="Munnar, Kerala"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="activityType">
                  Activity Type *
                </label>
                <select
                  id="activityType"
                  className={inputClass}
                  value={form.activityType}
                  onChange={(e) =>
                    updateField("activityType", e.target.value)
                  }
                  required
                >
                  <option value="">Select activity</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Trekking">Trekking</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Wildlife">Wildlife</option>
                  <option value="Water Sports">Water Sports</option>
                  <option value="Camping">Camping</option>
                  <option value="Food Tour">Food Tour</option>
                  <option value="City Tour">City Tour</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              2. Duration and Pricing
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="duration">
                  Duration *
                </label>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  step="1"
                  className={inputClass}
                  value={form.duration}
                  onChange={(e) =>
                    updateField("duration", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="durationUnit">
                  Duration Unit *
                </label>
                <select
                  id="durationUnit"
                  className={inputClass}
                  value={form.durationUnit}
                  onChange={(e) =>
                    updateField("durationUnit", e.target.value)
                  }
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="maxParticipants">
                  Maximum Participants *
                </label>
                <input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  step="1"
                  className={inputClass}
                  value={form.maxParticipants}
                  onChange={(e) =>
                    updateField("maxParticipants", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="price">
                  Price per Person *
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="2500"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="currency">
                  Currency *
                </label>
                <select
                  id="currency"
                  className={inputClass}
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass} htmlFor="meetingPoint">
                  Meeting Point *
                </label>
                <input
                  id="meetingPoint"
                  className={inputClass}
                  value={form.meetingPoint}
                  onChange={(e) =>
                    updateField("meetingPoint", e.target.value)
                  }
                  placeholder="Tour starting location"
                  required
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              3. Tour Details
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Enter one item per line, or separate items with commas.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="itinerary">
                  Itinerary
                </label>
                <textarea
                  id="itinerary"
                  className={inputClass}
                  rows={4}
                  value={form.itinerary}
                  onChange={(e) =>
                    updateField("itinerary", e.target.value)
                  }
                  placeholder={"Arrival and welcome\nGuided tour\nReturn journey"}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="highlights">
                  Highlights
                </label>
                <textarea
                  id="highlights"
                  className={inputClass}
                  rows={4}
                  value={form.highlights}
                  onChange={(e) =>
                    updateField("highlights", e.target.value)
                  }
                  placeholder={"Scenic views\nLocal guide\nPhotography"}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="inclusions">
                  Inclusions
                </label>
                <textarea
                  id="inclusions"
                  className={inputClass}
                  rows={4}
                  value={form.inclusions}
                  onChange={(e) =>
                    updateField("inclusions", e.target.value)
                  }
                  placeholder={"Professional guide\nEntry tickets"}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="exclusions">
                  Exclusions
                </label>
                <textarea
                  id="exclusions"
                  className={inputClass}
                  rows={4}
                  value={form.exclusions}
                  onChange={(e) =>
                    updateField("exclusions", e.target.value)
                  }
                  placeholder={"Personal expenses\nAdditional meals"}
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              4. Tour Images
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              Upload up to 10 images. Each image must be smaller than 10 MB.
              Uploading images requires valid Cloudinary configuration.
            </p>

            <label className={labelClass} htmlFor="images">
              Select Images
            </label>
            <input
              id="images"
              type="file"
              accept="image/*"
              multiple
              className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-800`}
              onChange={(e) => {
                setImages(Array.from(e.target.files ?? []));
                setError("");
              }}
            />

            {images.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {images.length} image(s) selected:{" "}
                {images.map((image) => image.name).join(", ")}
              </p>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#087f6e] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#066354] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Tour..." : "Create Tour"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
