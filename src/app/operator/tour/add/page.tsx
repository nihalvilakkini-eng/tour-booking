
"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

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

const fieldClass =
  "mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#087f6e] focus:ring-2 focus:ring-emerald-100";

const labelClass = "text-sm font-semibold text-gray-800";

function parseList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default function AddTourPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<TourForm>(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    setError("");
    setSuccess("");

    if (images.length + selected.length > 10) {
      setError("Maximum 10 images are allowed.");
      return;
    }

    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setError("Please select image files only.");
      return;
    }

    if (selected.some((file) => file.size === 0)) {
      setError("Empty image files are not allowed.");
      return;
    }

    if (
      [...images, ...selected].some(
        (file) => file.size > 10 * 1024 * 1024
      )
    ) {
      setError("Each image must be less than 10MB.");
      return;
    }

    const updated = [...images, ...selected];

    setImages(updated);
    setPreviews(updated.map((file) => URL.createObjectURL(file)));
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index);

    setImages(updated);
    setPreviews(updated.map((file) => URL.createObjectURL(file)));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.destination.trim() ||
      !form.activityType ||
      !form.meetingPoint.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!Number.isFinite(Number(form.duration)) || Number(form.duration) < 1) {
      setError("Duration must be at least 1.");
      return;
    }

    if (
      !form.price.trim() ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Enter a valid price.");
      return;
    }

    if (
      !Number.isInteger(Number(form.maxParticipants)) ||
      Number(form.maxParticipants) < 1
    ) {
      setError("Maximum participants must be at least 1.");
      return;
    }

    if (process.env.NODE_ENV === "production" && images.length === 0) {
      setError("Please upload at least one tour image.");
      return;
    }

    const data = new FormData();

    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("destination", form.destination.trim());
    data.append("activityType", form.activityType);
    data.append("duration", form.duration);
    data.append("durationUnit", form.durationUnit);
    data.append("price", form.price);
    data.append("currency", form.currency);
    data.append("maxParticipants", form.maxParticipants);
    data.append("meetingPoint", form.meetingPoint.trim());

    for (const item of parseList(form.itinerary)) {
      data.append("itinerary", item);
    }

    for (const item of parseList(form.highlights)) {
      data.append("highlights", item);
    }

    for (const item of parseList(form.inclusions)) {
      data.append("inclusions", item);
    }

    for (const item of parseList(form.exclusions)) {
      data.append("exclusions", item);
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

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("json")) {
        throw new Error(
          `The tour service returned an unexpected response (HTTP ${response.status}). Please try again, and contact support if the problem continues.`
        );
      }

      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        throw new Error("The tour service returned invalid JSON. Please try again.");
      }

      if (!isRecord(responseBody)) {
        throw new Error("The tour service returned an invalid response. Please try again.");
      }

      if (!response.ok || responseBody.success !== true) {
        if (response.status === 401) {
          throw new Error("Please log in to create a tour.");
        }

        if (response.status === 403) {
          throw new Error(
            "Only users with the operator role can create tours."
          );
        }

        throw new Error(
          typeof responseBody.message === "string"
            ? responseBody.message
            : "Could not create tour."
        );
      }

      setSuccess("Tour created successfully!");

      const tourId =
        isRecord(responseBody.data) && typeof responseBody.data._id === "string"
          ? responseBody.data._id
          : null;

      if (tourId) {
        router.push(`/operator/dashboard/tours/${tourId}`);
      } else {
        router.push("/operator/dashboard/tours");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/operator/dashboard/tours")}
          className="mb-6 text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to My Tours
        </button>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#087f6e]">
            WAYORA / Operator
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Add New Tour
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Create your tour listing and share your experience with travelers.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Basic Information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="title">
                  Tour title *
                </label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="Munnar Tea Garden Adventure"
                  maxLength={150}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="destination">
                  Destination *
                </label>
                <input
                  id="destination"
                  name="destination"
                  value={form.destination}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="Munnar, Kerala"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="activityType">
                  Activity type *
                </label>
                <select
                  id="activityType"
                  name="activityType"
                  value={form.activityType}
                  onChange={updateField}
                  className={fieldClass}
                  required
                >
                  <option value="">Select activity</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Nature">Nature</option>
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Food">Food & Culinary</option>
                  <option value="Water Sports">Water Sports</option>
                  <option value="Wildlife">Wildlife</option>
                  <option value="City Tour">City Tour</option>
                  <option value="Hiking">Hiking & Trekking</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="description">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="Describe the tour and what travelers can experience..."
                  rows={5}
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Price, Duration & Capacity
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="price">
                  Price per person *
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="1500"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={updateField}
                  className={fieldClass}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="maxParticipants">
                  Maximum participants *
                </label>
                <input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxParticipants}
                  onChange={updateField}
                  className={fieldClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="duration">
                  Duration *
                </label>
                <input
                  id="duration"
                  name="duration"
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration}
                  onChange={updateField}
                  className={fieldClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="durationUnit">
                  Duration unit *
                </label>
                <select
                  id="durationUnit"
                  name="durationUnit"
                  value={form.durationUnit}
                  onChange={updateField}
                  className={fieldClass}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">Meeting Point</h2>

            <label
              className={`${labelClass} mt-5 block`}
              htmlFor="meetingPoint"
            >
              Meeting point address *
            </label>
            <textarea
              id="meetingPoint"
              name="meetingPoint"
              value={form.meetingPoint}
              onChange={updateField}
              className={fieldClass}
              placeholder="Meeting location and address"
              rows={3}
              required
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Itinerary & Highlights
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter one item per line. Comma-separated values are also
              supported.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <label className={labelClass} htmlFor="itinerary">
                  Itinerary
                </label>
                <textarea
                  id="itinerary"
                  name="itinerary"
                  value={form.itinerary}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder={"Meet your guide\nExplore the destination\nEnjoy the activity"}
                  rows={4}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="highlights">
                  Highlights
                </label>
                <textarea
                  id="highlights"
                  name="highlights"
                  value={form.highlights}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder={"Scenic views\nProfessional guide\nLocal experiences"}
                  rows={3}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="inclusions">
                    What's included
                  </label>
                  <textarea
                    id="inclusions"
                    name="inclusions"
                    value={form.inclusions}
                    onChange={updateField}
                    className={fieldClass}
                    placeholder={"Guide\nEntry tickets"}
                    rows={3}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="exclusions">
                    What's excluded
                  </label>
                  <textarea
                    id="exclusions"
                    name="exclusions"
                    value={form.exclusions}
                    onChange={updateField}
                    className={fieldClass}
                    placeholder={"Personal expenses\nAdditional meals"}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Tour Photos {process.env.NODE_ENV === "production" ? "*" : "(optional)"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {process.env.NODE_ENV === "production"
                ? "Upload 1–10 images. Each file must be under 10MB."
                : "Images are optional during development. Uploading images requires Cloudinary to be configured. Each file must be under 10MB."}
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImages}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-8 text-center transition hover:border-[#087f6e] hover:bg-emerald-50"
            >
              <span className="text-3xl text-[#087f6e]">↑</span>
              <span className="mt-3 font-bold text-gray-900">
                Choose images
              </span>
              <span className="mt-1 text-sm text-gray-500">
                JPG, PNG or WebP
              </span>
            </button>

            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {previews.map((preview, index) => (
                  <div
                    key={`${images[index]?.name}-${index}`}
                    className="overflow-hidden rounded-xl border border-gray-200"
                  >
                    <img
                      src={preview}
                      alt={`Tour photo ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-2">
                      <p className="truncate text-xs text-gray-500">
                        {images[index]?.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-500">
              {images.length} / 10 images selected
            </p>
          </section>

          <div className="flex flex-col-reverse justify-end gap-3 pb-8 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => router.push("/operator/dashboard/tours")}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#087f6e] px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#066354] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating tour..." : "Create Tour →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
