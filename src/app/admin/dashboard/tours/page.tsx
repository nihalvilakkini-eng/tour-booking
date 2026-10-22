"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tour = {
  _id: string;
  title?: string;
  name?: string;
  destination?: string;
  activityType?: string;
  price?: number;
  duration?: number;
  durationUnit?: string;
  operator?: { name?: string; email?: string } | string;
  createdAt?: string;
};

export default function AdminToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTours() {
      try {
        const response = await fetch("/api/tours", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load tours.");
        }

        const list = data.tours ?? data.data ?? data;
        setTours(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load tours.");
      } finally {
        setLoading(false);
      }
    }

    void loadTours();
  }, []);

  const filtered = tours.filter((tour) =>
    `${tour.title ?? ""} ${tour.name ?? ""} ${tour.destination ?? ""} ${
      tour.activityType ?? ""
    }`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Tour Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review tours published on the platform.
            </p>
          </div>
          <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Total tours</p>
            <p className="text-2xl font-bold text-[#087f6e]">{tours.length}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tour, destination or activity..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
          />

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading tours...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No tours found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-4 py-4">Tour</th>
                    <th className="px-4 py-4">Destination</th>
                    <th className="px-4 py-4">Activity</th>
                    <th className="px-4 py-4">Duration</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tour) => {
                    const operator =
                      typeof tour.operator === "object" ? tour.operator : null;

                    return (
                      <tr key={tour._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-semibold">
                          {tour.title || tour.name || "Untitled tour"}
                        </td>
                        <td className="px-4 py-5">{tour.destination || "—"}</td>
                        <td className="px-4 py-5">{tour.activityType || "—"}</td>
                        <td className="px-4 py-5">
                          {tour.duration
                            ? `${tour.duration} ${tour.durationUnit || "hours"}`
                            : "—"}
                        </td>
                        <td className="px-4 py-5 font-semibold text-[#087f6e]">
                          {typeof tour.price === "number"
                            ? tour.price.toLocaleString(undefined, {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-gray-600">
                          {operator?.name || operator?.email ||
                            (typeof tour.operator === "string"
                              ? tour.operator
                              : "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}