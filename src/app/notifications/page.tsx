"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  booking?: {
    _id: string;
    customerName?: string;
    bookingDate?: string;
    startTime?: string;
    participants?: number;
    status?: string;
  } | null;
  tour?: {
    _id: string;
    title?: string;
    destination?: string;
    images?: string[];
  } | null;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load notifications");
      }

      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event("wayora-notification-change"));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function markAllAsRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        window.dispatchEvent(new Event("wayora-notification-change"));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  }

  function handleNotificationClick(n: NotificationItem) {
    if (!n.isRead) {
      void markAsRead(n._id);
    }

    if (n.booking?._id) {
      router.push(`/bookings/${n.booking._id}`);
    } else if (n.tour?._id) {
      router.push(`/tours/${n.tour._id}`);
    }
  }

  const filteredNotifications = notifications.filter((n) =>
    activeTab === "unread" ? !n.isRead : true
  );

  return (
    <main className="min-h-screen bg-[#0b1116] py-10 px-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-400 shadow-sm">
                <Bell size={20} />
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-slate-400">
              Stay updated on your tour bookings, operator responses, and payments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchNotifications()}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#121a22] px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400"
              title="Refresh"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
              >
                <CheckCheck size={16} />
                <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "all"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === "unread"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-[#121a22]">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-400">Loading notifications...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-200">{error}</p>
            <button
              onClick={() => void fetchNotifications()}
              className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
            >
              Try Again
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#121a22] py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Bell size={28} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">
              {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {activeTab === "unread"
                ? "You are all caught up! Switch to 'All' to review previous updates."
                : "You will receive updates here whenever you book a tour or an operator responds."}
            </p>
            <Link
              href="/bookings"
              className="mt-5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
            >
              View My Bookings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const isConfirmed =
                n.type === "booking_confirmed" ||
                n.title.toLowerCase().includes("accepted") ||
                n.title.toLowerCase().includes("confirmed") ||
                n.title.toLowerCase().includes("successful");
              const isRejected =
                n.type === "booking_rejected" ||
                n.title.toLowerCase().includes("rejected");
              const isCancelled =
                n.type === "booking_cancelled" ||
                n.title.toLowerCase().includes("cancelled");

              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-5 transition sm:flex-row sm:items-start sm:justify-between ${
                    !n.isRead
                      ? "border-amber-500/40 bg-[#121a22] shadow-lg hover:border-amber-400"
                      : "border-white/10 bg-[#121a22]/70 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                        isConfirmed
                          ? "bg-emerald-500/15 text-emerald-400"
                          : isRejected
                          ? "bg-rose-500/15 text-rose-400"
                          : isCancelled
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {isConfirmed ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Bell size={20} />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-base font-semibold ${
                            !n.isRead ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                        )}
                      </div>

                      <p className="text-sm leading-relaxed text-slate-400">
                        {n.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {new Date(n.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>

                        {n.booking && (
                          <span className="flex items-center gap-1 font-medium text-amber-400">
                            <Calendar size={13} />
                            Booking #{n.booking._id.slice(-6).toUpperCase()}
                          </span>
                        )}

                        {n.tour?.destination && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin size={13} />
                            {n.tour.destination}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void markAsRead(n._id);
                        }}
                        className="rounded-lg border border-white/15 bg-[#0b1116] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-500/40 hover:text-amber-400"
                      >
                        Mark as read
                      </button>
                    )}

                    {(n.booking?._id || n.tour?._id) && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:underline">
                        <span>View</span>
                        <ExternalLink size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}