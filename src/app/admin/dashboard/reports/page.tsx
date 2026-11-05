"use client";

import { useCallback, useEffect, useState } from "react";

type ReportData = {
  totalUsers: number;
  totalTours: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyBookings: {
    month: string;
    total: number;
  }[];
};

const statusItems = [
  { key: "completedBookings", label: "Completed", color: "bg-green-500" },
  { key: "confirmedBookings", label: "Confirmed", color: "bg-blue-500" },
  { key: "pendingBookings", label: "Pending", color: "bg-yellow-500" },
  { key: "rejectedBookings", label: "Rejected", color: "bg-red-500" },
  { key: "cancelledBookings", label: "Cancelled", color: "bg-gray-400" },
] as const;

export default function ReportsPage() {
  const [range, setRange] = useState("30d");

  const [data, setData] = useState<ReportData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/dashboard/reports?range=${range}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load reports");
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const cards = [
    {
      title: "Total Users",
      value: data?.totalUsers ?? 0,
      icon: "👥",
    },
    {
      title: "Total Tours",
      value: data?.totalTours ?? 0,
      icon: "🌍",
    },
    {
      title: "Total Bookings",
      value: data?.totalBookings ?? 0,
      icon: "📅",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(data?.totalRevenue ?? 0),
      icon: "💰",
    },
  ];

  const maxBookings = Math.max(
    ...(data?.monthlyBookings.map((item) => item.total) ?? [0]),
    1
  );

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
              WAYORA ADMINISTRATION
            </p>

            <h1 className="text-3xl font-bold">
              Reports
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              View your platform statistics and booking performance.
            </p>
          </div>

          <button
            onClick={loadReports}
            disabled={loading}
            className="rounded-xl bg-[#087f6e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#066354] disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-bold">Platform Overview</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a period to view booking reports.
            </p>
          </div>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={loadReports}
              className="ml-3 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>

                <span className="text-2xl">{card.icon}</span>
              </div>

              <h3 className="mt-5 text-2xl font-bold text-[#087f6e]">
                {loading ? "—" : card.value}
              </h3>
            </div>
          ))}
        </section>

        {/* Booking Status */}
        <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Booking Status
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Booking breakdown for the selected period.
          </p>

          <div className="mt-7 space-y-6">
            {statusItems.map((item) => {
              const count = data?.[item.key] ?? 0;

              const percentage =
                data?.totalBookings
                  ? (count / data.totalBookings) * 100
                  : 0;

              return (
                <div key={item.key}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {item.label}
                    </span>

                    <span className="font-bold text-gray-800">
                      {loading ? "—" : count}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{
                        width: `${loading ? 0 : percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Monthly Bookings */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Monthly Bookings
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Booking activity over the last six months.
          </p>

          <div className="mt-8 flex h-64 items-end justify-around gap-3 border-b border-gray-200 pb-2">
            {(data?.monthlyBookings ?? []).map((item) => {
              const height = (item.total / maxBookings) * 100;

              return (
                <div
                  key={item.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-bold text-gray-600">
                    {loading ? "" : item.total}
                  </span>

                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-[#087f6e] transition-all duration-500"
                      style={{
                        height: `${loading ? 0 : Math.max(height, item.total > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-medium text-gray-500">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          Wayora Platform Reports · Data fetched from MongoDB
        </p>
      </div>
    </main>
  );
}