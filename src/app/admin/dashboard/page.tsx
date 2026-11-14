"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  users: number;
  operators: number;
  applications: number;
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
    countLabel: "Total users",
  },
  {
    title: "Operators",
    description: "Approve and manage tour operators",
    href: "/admin/dashboard/operators",
    icon: "🧭",
    key: "operators",
    countLabel: "Approved operators",
  },
  {
    title: "Operator Applications",
    description: "Review, approve & reject operator requests",
    href: "/admin/dashboard/operator-applications",
    icon: "📋",
    key: "applications",
    countLabel: "Pending review",
  },
  {
    title: "Tours",
    description: "View and manage all tour listings",
    href: "/admin/dashboard/tours",
    icon: "🌍",
    key: "tours",
    countLabel: "Total tours",
  },
  {
    title: "Bookings",
    description: "Monitor all platform bookings",
    href: "/admin/dashboard/bookings",
    icon: "📅",
    key: "bookings",
    countLabel: "Total bookings",
  },
  {
    title: "Reviews",
    description: "Manage customer reviews",
    href: "/admin/dashboard/reviews",
    icon: "⭐",
    key: "reviews",
    countLabel: "Total reviews",
  },
] as const;

const managementLinks = [
  {
    title: "Operator Messages",
    description: "Private direct communication with tour operators",
    href: "/admin/dashboard/messages",
    icon: "💬",
  },
  {
    title: "Operator Applications",
    description: "Inspect business credentials, approve or reject applications",
    href: "/admin/dashboard/operator-applications",
    icon: "📋",
  },
  {
    title: "Availability",
    description: "Monitor tour schedules and seat availability",
    href: "/admin/dashboard/availability",
    icon: "🗓️",
  },
  {
    title: "Popular Destinations",
    description: "Create and manage homepage destination places",
    href: "/admin/dashboard/destinations",
    icon: "📍",
  },
  {
    title: "Popular Experiences",
    description: "Create and manage homepage experience places",
    href: "/admin/dashboard/experiences",
    icon: "✨",
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
    applications: 0,
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
            applications: Number(data.pendingApplications ?? 0),
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
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Dashboard header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              ✦ WAYORA ADMINISTRATION
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage tours, operators, applications, customers and bookings from one place.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-[#121a22] px-5 py-3 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-amber-500/50 hover:text-amber-400"
          >
            View Website ↗
          </Link>
        </header>

        {/* Quick actions */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-[#121a22] p-5 shadow-xl sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-400">
                Review applications, create tours and manage your platform.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/dashboard/operator-applications"
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
              >
                📋 Review Applications ({loading ? "…" : stats.applications})
              </Link>

              <Link
                href="/admin/dashboard/tours/create"
                className="inline-flex items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-500/25"
              >
                + Create Tour
              </Link>

              <Link
                href="/admin/dashboard/tours"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-[#0b1116] px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400"
              >
                Manage Tours →
              </Link>
            </div>
          </div>
        </section>

        {/* API errors */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p className="font-semibold text-white">{error}</p>
            <p className="mt-1 text-xs text-rose-300">
              Check your admin dashboard API and make sure you are logged in with an admin account.
            </p>
          </div>
        )}

        {/* Statistics */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-white">Platform Overview</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.key}
                href={section.href}
                className="group rounded-2xl border border-white/10 bg-[#121a22] p-6 shadow-lg transition hover:-translate-y-1 hover:border-amber-500/45 hover:shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-2xl">
                    {section.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-400 transition group-hover:text-amber-400">
                    Open →
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{section.title}</h3>

                <p className="mt-1 text-sm text-slate-400">
                  {section.description}
                </p>

                <p className="mt-5 text-3xl font-extrabold text-amber-400">
                  {loading ? "—" : stats[section.key]}
                </p>

                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                  {section.countLabel}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Additional management modules */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-white">More Management</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managementLinks.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-white/10 bg-[#121a22] p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-amber-500/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0b1116] text-xl">
                  {item.icon}
                </span>

                <h3 className="mt-4 font-bold text-white group-hover:text-amber-300 transition">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-400">
                  {item.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-amber-400">
                  Open module →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer banner */}
        <section className="mt-10 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#121a22] via-[#16202a] to-[#0b1116] p-6 text-white shadow-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            ✦ WAYORA PLATFORM MANAGEMENT
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-white">
            Manage your travel marketplace
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Review incoming operator applications, create tours, manage operators, review bookings and monitor activity
            across your travel booking platform.
          </p>

          <Link
            href="/admin/dashboard/operator-applications"
            className="mt-5 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
          >
            Review Operator Applications →
          </Link>
        </section>
      </div>
    </main>
  );
}