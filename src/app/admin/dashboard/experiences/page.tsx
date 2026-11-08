"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import TourImage from "@/components/tours/TourImage";

type Place = {
  _id: string;
  name: string;
  description: string;
  image: string;
  order?: number;
  isActive?: boolean;
};

type PlaceForm = {
  name: string;
  description: string;
  imageUrl: string;
  order: string;
  isActive: boolean;
  imageFile: File | null;
};

const initialForm: PlaceForm = {
  name: "",
  description: "",
  imageUrl: "",
  order: "0",
  isActive: true,
  imageFile: null,
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600";
const labelClass = "text-sm font-semibold text-slate-700";

export default function AdminExperiencesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<Place | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PlaceForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/experiences", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load places.");
      }

      setPlaces(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load places.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPlaces();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadPlaces]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(place: Place) {
    setEditing(place);
    setForm({
      name: place.name,
      description: place.description,
      imageUrl: place.image,
      order: String(place.order ?? 0),
      isActive: place.isActive !== false,
      imageFile: null,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(initialForm);
  }

  function updateField<K extends keyof PlaceForm>(field: K, value: PlaceForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      updateField("imageFile", null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Place image must be an image file.");
      updateField("imageFile", null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Place image must be under 10MB.");
      updateField("imageFile", null);
      return;
    }

    setError("");
    updateField("imageFile", file);
  }

  async function savePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.description.trim()) {
      setError("Experience name and description are required.");
      return;
    }

    if (!form.imageFile && !form.imageUrl.trim()) {
      setError("Please upload a place image or provide an image URL.");
      return;
    }

    const order = Number(form.order);
    if (!Number.isFinite(order) || order < 0) {
      setError("Order must be zero or greater.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("description", form.description.trim());
      data.append("imageUrl", form.imageUrl.trim());
      data.append("order", String(order));
      data.append("isActive", String(form.isActive));

      if (form.imageFile) {
        data.append("image", form.imageFile);
      }

      const response = await fetch(
        editing ? `/api/admin/experiences/${editing._id}` : "/api/admin/experiences",
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          body: data,
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save place.");
      }

      setSuccess(editing ? "Place updated successfully." : "Place created successfully.");
      closeForm();
      await loadPlaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save place.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlace(place: Place) {
    if (!window.confirm(`Delete "${place.name}" from popular experiences?`)) {
      return;
    }

    setDeletingId(place._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/experiences/${place._id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete place.");
      }

      setSuccess("Place deleted successfully.");
      await loadPlaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete place.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA ADMIN</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Popular Experiences
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage the experience cards shown on the homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Plus size={16} /> Create Place
          </button>
          <button
            type="button"
            onClick={() => void loadPlaces()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
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
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">Experience places</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${places.length} place(s) found`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-2xl border border-slate-200"
              >
                <div className="h-44 bg-slate-200" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-10 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-800">No places yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Create your first popular experience to show it on the website.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Create Place
            </button>
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {places.map((place) => (
              <article
                key={place._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <TourImage
                    images={[place.image]}
                    alt={place.name}
                    className="object-cover"
                  />
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        place.isActive === false
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {place.isActive === false ? "Inactive" : "Active"}
                    </span>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                      Order {place.order ?? 0}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-slate-900">{place.name}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {place.description}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(place)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePlace(place)}
                      disabled={deletingId === place._id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      {deletingId === place._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={savePlace}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editing ? "Edit Place" : "Create Place"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This place will appear in the homepage Popular Experiences section.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Place name *
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                Description *
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  required
                />
              </label>

              <label className={labelClass}>
                Place image URL
                <input
                  className={inputClass}
                  value={form.imageUrl}
                  onChange={(event) => updateField("imageUrl", event.target.value)}
                  placeholder="https://... or /images/..."
                />
              </label>

              <label className={labelClass}>
                Or upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2.5 file:font-semibold file:text-teal-800"
                />
                {form.imageFile && (
                  <span className="mt-2 block text-xs text-slate-500">
                    Selected: {form.imageFile.name}
                  </span>
                )}
              </label>

              {!form.imageFile && form.imageUrl && (
                <div className="sm:col-span-2">
                  <p className={labelClass}>Current image</p>
                  <div className="relative mt-2 h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <TourImage
                      images={[form.imageUrl]}
                      alt="Place preview"
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

              <label className={labelClass}>
                Display order
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.order}
                  onChange={(event) => updateField("order", event.target.value)}
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateField("isActive", event.target.checked)}
                  className="h-4 w-4 accent-teal-700"
                />
                Active on website
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Place"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
