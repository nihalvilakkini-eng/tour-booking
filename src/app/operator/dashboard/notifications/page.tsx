"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";

type BookingRef = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  participants?: number;
  bookingDate?: string;
  startTime?: string;
};

type TourRef = {
  title?: string;
  destination?: string;
  images?: string[];
};

type Notification = {
  _id: string;
  title: string;
  message: string;
  isRead?: boolean;
  createdAt?: string;
  booking?: BookingRef | string | null;
  tour?: TourRef | string | null;
};

function objectValue<T>(value: T | string | null | undefined): T | null {
  return value && typeof value === "object" ? value : null;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OperatorNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionId, setActionId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/notifications", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load notifications.");
      }

      setNotifications(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  async function markAsRead(notification: Notification) {
    if (notification.isRead) return;

    setActionId(notification._id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/notifications/${notification._id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to mark notification as read.");
      }

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item
        )
      );
      setSuccess("Notification marked as read.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            ✦ WAYORA PARTNER
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Notifications</h1>
          <p className="mt-2 text-sm text-slate-400">
            Customer tour booking requests for your operator account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#121a22] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-400 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {(error || success) && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            error
              ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
              : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121a22] shadow-xl">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Booking requests</h2>
              <p className="mt-1 text-sm text-slate-400">
                {loading
                  ? "Loading..."
                  : `${unreadCount} unread · ${notifications.length} total`}
              </p>
            </div>
            <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
              Booking requests only
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-600" size={36} />
            <p className="mt-3 font-semibold text-white">
              No booking request notifications
            </p>
            <p className="mt-1 text-sm text-slate-400">
              New customer booking requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {notifications.map((notification) => {
              const booking = objectValue<BookingRef>(notification.booking);
              const tour = objectValue<TourRef>(notification.tour);
              const unread = !notification.isRead;

              return (
                <article
                  key={notification._id}
                  className={`flex flex-col gap-4 p-5 transition sm:flex-row sm:items-start ${
                    unread ? "bg-amber-500/[0.06]" : "bg-[#121a22]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white">
                        {notification.title || "Booking request"}
                      </h3>
                      {unread && (
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {notification.message}
                    </p>

                    <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                      {tour?.title && (
                        <p>
                          <span className="font-semibold text-slate-200">Tour:</span>{" "}
                          {tour.title}
                          {tour.destination ? ` · ${tour.destination}` : ""}
                        </p>
                      )}
                      {booking?.customerName && (
                        <p>
                          <span className="font-semibold text-slate-200">Customer:</span>{" "}
                          {booking.customerName}
                        </p>
                      )}
                      {booking?.customerEmail && (
                        <p>
                          <span className="font-semibold text-slate-200">Email:</span>{" "}
                          {booking.customerEmail}
                        </p>
                      )}
                      {booking?.customerPhone && (
                        <p>
                          <span className="font-semibold text-slate-200">Phone:</span>{" "}
                          {booking.customerPhone}
                        </p>
                      )}
                      {booking?.participants != null && (
                        <p>
                          <span className="font-semibold text-slate-200">Travellers:</span>{" "}
                          {booking.participants}
                        </p>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void markAsRead(notification)}
                    disabled={unread === false || actionId === notification._id}
                    title={unread ? "Mark as read" : "Already read"}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                      unread
                        ? "border-amber-500 bg-amber-500 text-slate-950 hover:bg-amber-400"
                        : "border-white/10 bg-[#0b1116] text-slate-500"
                    } disabled:opacity-60`}
                  >
                    <Check size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}