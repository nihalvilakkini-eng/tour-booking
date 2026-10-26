"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type NotificationRecord = {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  user?:
    | {
        _id?: string;
        name?: string;
        lastName?: string;
        email?: string;
      }
    | string
    | null;
  booking?:
    | {
        _id?: string;
        status?: string;
        bookingDate?: string;
      }
    | string
    | null;
  tour?:
    | {
        _id?: string;
        title?: string;
        destination?: string;
      }
    | string
    | null;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/notifications", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load notifications.");
      }

      const list = Array.isArray(data.notifications)
        ? data.notifications
        : Array.isArray(data.data)
          ? data.data
          : [];

      setNotifications(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const user = typeof notification.user === "object" && notification.user ? notification.user : null;
      const tour = typeof notification.tour === "object" && notification.tour ? notification.tour : null;
      const matchesRead =
        filter === "all" ||
        (filter === "read" && notification.isRead) ||
        (filter === "unread" && !notification.isRead);

      const searchable = [
        notification.title,
        notification.message,
        notification.type,
        user?.name,
        user?.email,
        tour?.title,
        tour?.destination,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRead && (!searchText || searchable.includes(searchText));
    });
  }, [filter, notifications, search]);

  async function markAsRead(notificationId: string) {
    try {
      setUpdatingId(notificationId);
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to mark notification as read.");
      }

      await loadNotifications();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notification."
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Notifications</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review platform updates and mark relevant notices as read.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Total notifications</p>
            <p className="text-2xl font-bold">{notifications.length}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications or recipient..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading notifications...</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No notifications found.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredNotifications.map((notification) => {
                const user = typeof notification.user === "object" && notification.user ? notification.user : null;
                const tour = typeof notification.tour === "object" && notification.tour ? notification.tour : null;
                const date = notification.createdAt ? new Date(notification.createdAt) : null;

                return (
                  <article
                    key={notification._id}
                    className={`rounded-2xl border p-5 ${notification.isRead ? "border-gray-100 bg-white" : "border-[#cfe7e0] bg-[#f6fbfa]"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">{notification.title || "Notification"}</h2>
                          {!notification.isRead && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Unread
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {notification.message || "No message provided."}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={updatingId === notification._id || notification.isRead}
                        onClick={() => void markAsRead(notification._id)}
                        className="rounded-lg border border-[#087f6e] bg-white px-4 py-2 text-sm font-semibold text-[#087f6e] transition hover:bg-[#edf8f6] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === notification._id
                          ? "Updating..."
                          : notification.isRead
                            ? "Read"
                            : "Mark as read"}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>
                        Recipient: {user?.name || user?.email || "Unknown user"}
                      </span>
                      {tour?.title && <span>Tour: {tour.title}</span>}
                      {notification.type && <span>Type: {notification.type}</span>}
                      {date && !Number.isNaN(date.getTime()) && (
                        <span>Created: {date.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
