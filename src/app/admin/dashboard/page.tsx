"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  users: number;
  operators: number;
  tours: number;
  bookings: number;
  reviews: number;
};

const sections = [
  { title: "Users", description: "Manage registered accounts", href: "/admin/dashboard/users", icon: "👥", key: "users" },
  { title: "Operators", description: "Manage tour operators", href: "/admin/dashboard/operators", icon: "🧭", key: "operators" },
  { title: "Tours", description: "Review all tour listings", href: "/admin/dashboard/tours", icon: "🌍", key: "tours" },
  { title: "Bookings", description: "Monitor platform bookings", href: "/admin/dashboard/bookings", icon: "📅", key: "bookings" },
  { title: "Reviews", description: "Moderate customer reviews", href: "/admin/dashboard/reviews", icon: "⭐", key: "reviews" },
] as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0, operators: 0, tours: 0, bookings: 0, reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/admin/dashboard", {
          credentials: "include",
          cache: "no-store",
        });
        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Admin statistics API returned an unexpected response (HTTP ${response.status}).`
          );
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Could not load dashboard statistics."
          );
        }

        const data = result.data;
        setStats({
          users: data.totalUsers,
          operators: data.totalOperators,
          tours: data.totalTours,
          bookings: data.totalBookings,
          reviews: data.totalReviews,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#087f6e]">
              WAYORA Administration
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage users, operators, tours and bookings in one place.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold hover:border-[#087f6e]"
          >
            View Website ↗
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <p className="mt-1 text-xs">
              Check that the admin statistics API exists and that you are logged in as admin.
            </p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#b9dfd7] hover:shadow-md"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-3xl">{section.icon}</span>
                <span className="text-sm text-gray-400 transition group-hover:text-[#087f6e]">
                  Open →
                </span>
              </div>

              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-1 text-sm text-gray-500">{section.description}</p>

              <p className="mt-5 text-2xl font-bold text-[#087f6e]">
                {loading ? "—" : stats[section.key]}
              </p>
              <p className="mt-1 text-xs text-gray-400">Total {section.title.toLowerCase()}</p>
            </Link>
          ))}
        </section>

        <div className="mt-8 rounded-2xl bg-[#087f6e] p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-white/75">Platform management</p>
          <h2 className="mt-2 text-2xl font-bold">Grow the WAYORA community</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
            Review user accounts, approve trusted operators and monitor activity
            across the booking platform.
          </p>
          <Link
            href="/admin/dashboard/users"
            className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#087f6e] hover:bg-gray-100"
          >
            Manage Users →
          </Link>
        </div>
      </div>
    </main>
  );
}