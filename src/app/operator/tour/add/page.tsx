"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import TourItineraryBuilder, {
  type EditableItineraryDay,
} from "@/components/forms/TourItineraryBuilder";
import {
  uploadMultipleImagesToCloudinary,
  uploadItineraryActivityImages,
} from "@/lib/client-image-upload";
import { parseApiResponse } from "@/lib/api-response";

type TourForm = {
  title: string;
  description: string;
  destination: string;
  country: string;
  state: string;
  category: string;
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

type ItineraryDay = EditableItineraryDay;

const initialForm: TourForm = {
  title: "",
  description: "",
  destination: "",
  country: "",
  state: "",
  category: "",
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



export default function AddTourPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<TourForm>(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    message: string;
    percent: number;
  } | null>(null);
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
      // Keep category and activityType aligned
      ...(name === "activityType" ? { category: value } : {}),
      ...(name === "category" ? { activityType: value } : {}),
    }));
  }

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    setError("");
    setSuccess("");

    if (images.length + selected.length > 10) {
      setError("Maximum 10 images are allowed for the tour gallery.");
      return;
    }

    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setError("Please select image files only (JPG, PNG, WebP).");
      return;
    }

    if (selected.some((file) => file.size === 0)) {
      setError("Empty image files are not allowed.");
      return;
    }

    if (
      [...images, ...selected].some(
        (file) => file.size > 15 * 1024 * 1024
      )
    ) {
      setError("Each image file must be under 15MB before compression.");
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

  function setAsMainCover(index: number) {
    if (index === 0) return;
    const reorderedImages = [...images];
    const [selected] = reorderedImages.splice(index, 1);
    reorderedImages.unshift(selected);

    setImages(reorderedImages);
    setPreviews(reorderedImages.map((file) => URL.createObjectURL(file)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setError("");
    setSuccess("");

    // Validate required fields
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.destination.trim() ||
      !(form.activityType || form.category) ||
      !form.meetingPoint.trim()
    ) {
      setError("Please complete all required fields (title, destination, activity type, description, meeting point).");
      return;
    }

    const durationNum = Number(form.duration);
    if (!Number.isFinite(durationNum) || durationNum < 1) {
      setError("Duration must be at least 1.");
      return;
    }

    const priceNum = Number(form.price);
    if (!form.price.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Tour price must be greater than zero.");
      return;
    }

    const maxParticipantsNum = Number(form.maxParticipants);
    if (!Number.isInteger(maxParticipantsNum) || maxParticipantsNum < 1) {
      setError("Maximum participants must be at least 1.");
      return;
    }

    if (process.env.NODE_ENV === "production" && images.length === 0) {
      setError("Please upload at least one tour photo for the main cover.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload compressed images directly to Cloudinary
      let uploadedImageUrls: string[] = [];

      if (images.length > 0) {
        setUploadProgress({
          current: 0,
          total: images.length,
          message: `Compressing and uploading ${images.length} image${images.length > 1 ? "s" : ""} to Cloudinary...`,
          percent: 5,
        });

        uploadedImageUrls = await uploadMultipleImagesToCloudinary(
          images,
          (current, total, message, percent) => {
            setUploadProgress({ current, total, message, percent });
          }
        );
      }

      // Step 2: Upload any itinerary activity images to Cloudinary
      setUploadProgress({
        current: images.length,
        total: images.length,
        message: "Processing itinerary and activity photos...",
        percent: 90,
      });

      const updatedItineraryDays = await uploadItineraryActivityImages(
        itineraryDays,
        (statusMessage) => {
          setUploadProgress({
            current: images.length,
            total: images.length,
            message: statusMessage,
            percent: 92,
          });
        }
      );

      // Step 3: Submit lightweight JSON payload with Cloudinary URLs only
      setUploadProgress({
        current: images.length,
        total: images.length,
        message: "Finalizing tour creation...",
        percent: 96,
      });

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        destination: form.destination.trim(),
        country: form.country.trim(),
        state: form.state.trim(),
        category: (form.category || form.activityType).trim(),
        activityType: (form.activityType || form.category).trim(),
        duration: durationNum,
        durationUnit: form.durationUnit,
        price: priceNum,
        currency: form.currency,
        maxParticipants: maxParticipantsNum,
        meetingPoint: form.meetingPoint.trim(),
        itinerary: parseList(form.itinerary),
        highlights: parseList(form.highlights),
        inclusions: parseList(form.inclusions),
        exclusions: parseList(form.exclusions),
        itineraryDays: updatedItineraryDays.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          activities: day.activities.map((activity) => ({
            title: activity.title,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            location: activity.location,
            description: activity.description,
            travelMode: activity.travelMode,
            latitude: activity.latitude ? Number(activity.latitude) : undefined,
            longitude: activity.longitude ? Number(activity.longitude) : undefined,
            instructions: activity.instructions,
            image: activity.image || "",
          })),
        })),
        images: uploadedImageUrls,
      };

      const response = await fetch("/api/tours", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const parsed = await parseApiResponse<{
        success?: boolean;
        message?: string;
        data?: { _id?: string };
      }>(response, "Could not create tour");

      if (!parsed.ok) {
        throw new Error(parsed.message);
      }

      setSuccess("Tour created successfully!");

      const tourId = parsed.data?.data?._id ?? null;

      if (tourId) {
        router.push(`/operator/dashboard/tours/${tourId}`);
      } else {
        router.push("/operator/dashboard/tours");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong while creating the tour."
      );
    } finally {
      setLoading(false);
      setUploadProgress(null);
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
          <p className="mt-2 text-sm text-gray-600">
            Publish an exciting tour experience. Photos are optimized and uploaded securely to Cloudinary.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <div className="flex items-center gap-2 font-bold">
                <span>⚠️ Error</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            >
              ✓ {success}
            </div>
          )}

          {/* 1. Basic Information */}
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
                  placeholder="Munnar"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="activityType">
                  Category / Activity type *
                </label>
                <select
                  id="activityType"
                  name="activityType"
                  value={form.activityType}
                  onChange={updateField}
                  className={fieldClass}
                  required
                >
                  <option value="">Select activity / category</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Nature">Nature</option>
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Food">Food &amp; Culinary</option>
                  <option value="Water Sports">Water Sports</option>
                  <option value="Wildlife">Wildlife</option>
                  <option value="City Tour">City Tour</option>
                  <option value="Hiking">Hiking &amp; Trekking</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="country">
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  value={form.country}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="e.g. India"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="state">
                  State / Region
                </label>
                <input
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder="e.g. Kerala"
                />
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

          {/* 2. Price, Duration & Capacity */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Price, Duration &amp; Capacity
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
                  min="0.01"
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

          {/* 3. Meeting Point */}
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
              placeholder="Meeting location, landmarks, and departure instructions"
              rows={3}
              required
            />
          </section>

          {/* 4. Itinerary & Highlights */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-gray-900">
              Itinerary &amp; Highlights
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter one item per line. Comma-separated values are also supported.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <label className={labelClass} htmlFor="itinerary">
                  Simple Itinerary Overview
                </label>
                <textarea
                  id="itinerary"
                  name="itinerary"
                  value={form.itinerary}
                  onChange={updateField}
                  className={fieldClass}
                  placeholder={"Meet your guide\nExplore the destination\nEnjoy the local activity"}
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
                  placeholder={"Scenic mountain views\nCertified local guide\nAuthentic lunch included"}
                  rows={3}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="inclusions">
                    Inclusions (What&apos;s included)
                  </label>
                  <textarea
                    id="inclusions"
                    name="inclusions"
                    value={form.inclusions}
                    onChange={updateField}
                    className={fieldClass}
                    placeholder={"Professional tour guide\nEntry tickets\nBottled water"}
                    rows={3}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="exclusions">
                    Exclusions (What&apos;s excluded)
                  </label>
                  <textarea
                    id="exclusions"
                    name="exclusions"
                    value={form.exclusions}
                    onChange={updateField}
                    className={fieldClass}
                    placeholder={"Personal expenses\nHotel pickup\nGratuities"}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 5. Day-by-Day Itinerary Roadmap */}
          <TourItineraryBuilder
            days={itineraryDays}
            onChange={setItineraryDays}
          />

          {/* 6. Tour Photos & Gallery */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Tour Photos &amp; Image Gallery {process.env.NODE_ENV === "production" ? "*" : "(optional)"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  The first image serves as the Main Cover Photo. Upload up to 10 photos. Images are automatically compressed before uploading directly to Cloudinary.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                ☁ Cloudinary Enabled
              </span>
            </div>

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
              disabled={loading}
              onClick={() => fileRef.current?.click()}
              className="mt-5 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-5 py-8 text-center transition hover:border-[#087f6e] hover:bg-emerald-50 disabled:opacity-50"
            >
              <span className="text-3xl text-[#087f6e]">📷</span>
              <span className="mt-2 font-bold text-gray-900">
                Choose tour photos
              </span>
              <span className="mt-1 text-sm text-gray-500">
                JPG, PNG, or WebP. Auto-compressed before upload.
              </span>
            </button>

            {/* Gallery Previews with Cover Indicator */}
            {previews.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Gallery Preview ({images.length} / 10 photos)
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {previews.map((preview, index) => (
                    <div
                      key={`${images[index]?.name}-${index}`}
                      className={`relative overflow-hidden rounded-xl border transition ${
                        index === 0
                          ? "border-[#087f6e] ring-2 ring-[#087f6e]/30"
                          : "border-gray-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Tour photo ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />

                      {/* Main cover badge */}
                      {index === 0 ? (
                        <div className="absolute top-2 left-2 rounded-md bg-[#087f6e] px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          ★ Main Cover
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAsMainCover(index)}
                          className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur hover:bg-black/80"
                        >
                          Make Cover
                        </button>
                      )}

                      <div className="p-2.5 bg-white">
                        <p className="truncate text-xs text-gray-600 font-medium">
                          {images[index]?.name}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            {(images[index]?.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            disabled={loading}
                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload progress indicator */}
            {uploadProgress && (
              <div className="mt-5 rounded-2xl border border-[#087f6e]/30 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>{uploadProgress.message}</span>
                  <span>{uploadProgress.percent}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-200/80">
                  <div
                    className="h-full bg-[#087f6e] transition-all duration-300"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Form Actions */}
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
              {loading
                ? uploadProgress
                  ? `Uploading (${uploadProgress.percent}%)...`
                  : "Creating tour..."
                : "Create Tour →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
