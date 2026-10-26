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
  {
    title: "Users",
    description: "Manage registered accounts",
    href: "/admin/dashboard/users",
    icon: "👥",
    key: "users",
  },
  {
    title: "Operators",
    description: "Approve and manage tour operators",
    href: "/admin/dashboard/operators",
    icon: "🧭",
    key: "operators",
  },
  {
    title: "Tours",
    description: "View and manage all tour listings",
    href: "/admin/dashboard/tours",
    icon: "🌍",
    key: "tours",
  },
  {
    title: "Bookings",
    description: "Monitor all platform bookings",
    href: "/admin/dashboard/bookings",
    icon: "📅",
    key: "bookings",
  },
  {
    title: "Reviews",
    description: "Manage customer reviews",
    href: "/admin/dashboard/reviews",
    icon: "⭐",
    key: "reviews",
  },
] as const;

const managementLinks = [
  {
    title: "Availability",
    description: "Monitor tour schedules and seat availability",
    href: "/admin/dashboard/availability",
    icon: "🗓️",
  },
  {
    title: "Payments",
    description: "Track payment status and transactions",
    href: "/admin/dashboard/payments",
    icon: "💳",
  },
  {
    title: "Reports",
    description: "Review platform activity and performance",
    href: "/admin/dashboard/reports",
    icon: "📊",
  },
  {
    title: "Notifications",
    description: "Manage platform notifications",
    href: "/admin/dashboard/notifications",
    icon: "🔔",
  },
] as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    operators: 0,
    tours: 0,
    bookings: 0,
    reviews: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/admin/dashboard", {
          credentials: "include",
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Dashboard API returned an unexpected response (HTTP ${response.status}).`
          );
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Could not load dashboard statistics."
          );
        }

        const data = result.data;

        if (!data) {
          throw new Error("Dashboard statistics are missing from the API response.");
        }

        if (!cancelled) {
          setStats({
            users: Number(data.totalUsers ?? 0),
            operators: Number(data.totalOperators ?? 0),
            tours: Number(data.totalTours ?? 0),
            bookings: Number(data.totalBookings ?? 0),
            reviews: Number(data.totalReviews ?? 0),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Dashboard header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#087f6e]">
              WAYORA Administration
            </p>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage tours, operators, customers and bookings from one place.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#087f6e]"
          >
            View Website ↗
          </Link>
        </header>

        {/* Quick actions */}
        <section className="mb-8 rounded-2xl border border-[#d6eae5] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold">Quick Actions</h2>
              <p className="mt-1 text-sm text-gray-500">
                Create tours and manage your platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/dashboard/tours/create"
                className="inline-flex items-center justify-center rounded-xl bg-[#087f6e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#066354]"
              >
                + Create Tour
              </Link>

              <Link
                href="/admin/dashboard/tours"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#087f6e] hover:text-[#087f6e]"
              >
                Manage Tours →
              </Link>
            </div>
          </div>
        </section>

        {/* API errors */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <p className="mt-1 text-xs">
              Check your admin dashboard API and make sure you are logged in with an admin account.
            </p>
          </div>
        )}

        {/* Statistics */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Platform Overview</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                <h3 className="text-lg font-bold">{section.title}</h3>

                <p className="mt-1 text-sm text-gray-500">
                  {section.description}
                </p>

                <p className="mt-5 text-2xl font-bold text-[#087f6e]">
                  {loading ? "—" : stats[section.key]}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Total {section.title.toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Additional management modules */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">More Management</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {managementLinks.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#b9dfd7] hover:shadow-md"
              >
                <span className="text-2xl">{item.icon}</span>

                <h3 className="mt-4 font-bold">{item.title}</h3>

                <p className="mt-2 text-sm leading-5 text-gray-500">
                  {item.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-[#087f6e]">
                  Open module →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer banner */}
        <section className="mt-10 rounded-2xl bg-[#087f6e] p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-white/75">
            WAYORA Platform Management
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Manage your travel marketplace
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
            Create tours, manage operators, review bookings and monitor activity
            across your travel booking platform.
          </p>

          <Link
            href="/admin/dashboard/tours"
            className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#087f6e] transition hover:bg-gray-100"
          >
            Manage All Tours →
          </Link>
        </section>
      </div>
    </main>
  );
}