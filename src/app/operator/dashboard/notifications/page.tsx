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
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">
            Customer tour booking requests for your operator account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
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
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Booking requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Loading..."
                  : `${unreadCount} unread · ${notifications.length} total`}
              </p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Booking requests only
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-slate-300" size={36} />
            <p className="mt-3 font-semibold text-slate-800">
              No booking request notifications
            </p>
            <p className="mt-1 text-sm text-slate-500">
              New customer booking requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const booking = objectValue<BookingRef>(notification.booking);
              const tour = objectValue<TourRef>(notification.tour);
              const unread = !notification.isRead;

              return (
                <article
                  key={notification._id}
                  className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-start ${
                    unread ? "bg-teal-50/50" : "bg-white"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">
                        {notification.title || "Booking request"}
                      </h3>
                      {unread && (
                        <span className="rounded-full bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      {tour?.title && (
                        <p>
                          <span className="font-semibold text-slate-800">Tour:</span>{" "}
                          {tour.title}
                          {tour.destination ? ` · ${tour.destination}` : ""}
                        </p>
                      )}
                      {booking?.customerName && (
                        <p>
                          <span className="font-semibold text-slate-800">Customer:</span>{" "}
                          {booking.customerName}
                        </p>
                      )}
                      {booking?.customerEmail && (
                        <p>
                          <span className="font-semibold text-slate-800">Email:</span>{" "}
                          {booking.customerEmail}
                        </p>
                      )}
                      {booking?.customerPhone && (
                        <p>
                          <span className="font-semibold text-slate-800">Phone:</span>{" "}
                          {booking.customerPhone}
                        </p>
                      )}
                      {booking?.participants != null && (
                        <p>
                          <span className="font-semibold text-slate-800">Travellers:</span>{" "}
                          {booking.participants}
                        </p>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
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
                        ? "border-teal-700 bg-teal-700 text-white hover:bg-teal-800"
                        : "border-slate-200 bg-slate-50 text-slate-400"
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
