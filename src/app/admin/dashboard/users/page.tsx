"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TourImage from "@/components/tours/TourImage";

type UserRole = "user" | "operator" | "admin";

type User = {
  _id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt?: string;
};

type UserPage = {
  users: User[];
  currentUserId: string;
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
};

async function fetchUsers(
  search: string,
  status: string,
  page: number,
  signal: AbortSignal
): Promise<UserPage> {
  const params = new URLSearchParams({
    search,
    role: "user", // എപ്പോഴും സാധാരണ Users (Customers) മാത്രം എടുക്കാൻ
    status,
    page: String(page),
    limit: "10",
  });
  const response = await fetch(`/api/admin/users?${params}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to load users.");
  }

  const rawUsers = Array.isArray(result.users) ? result.users : [];
  return {
    users: rawUsers.filter((u: User) => u.role === "user"),
    currentUserId: result.currentUserId,
    pagination: result.pagination || { page: 1, total: 0, totalPages: 0 },
  };
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [pagination, setPagination] = useState<UserPage["pagination"]>({
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchUsers(search, statusFilter, page, controller.signal)
      .then((result) => {
        setUsers(result.users);
        setCurrentUserId(result.currentUserId || "");
        setPagination(result.pagination);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load users."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, refreshKey, search, statusFilter]);

  async function changeStatus(user: User) {
    if (user._id === currentUserId) return;
    const isCurrentlyActive = user.isActive !== false;
    const nextIsActive = !isCurrentlyActive;
    const action = nextIsActive ? "activate" : "deactivate";
    const name = [user.name, user.lastName].filter(Boolean).join(" ") || user.email;

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${name}'s account? ${
          nextIsActive
            ? "They will be able to sign in again."
            : "They will immediately lose access to Wayora."
        }`
      )
    ) {
      return;
    }

    try {
      setUpdatingId(user._id);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Unable to ${action} account.`);
      }

      setSuccess(`${name}'s account was ${nextIsActive ? "activated" : "deactivated"}.`);
      setRefreshKey((value) => value + 1);
      if (!nextIsActive && users.length === 1 && page > 1) {
        setPage((value) => value - 1);
      }
      if (selectedUser?._id === user._id) {
        setSelectedUser({ ...user, isActive: nextIsActive });
      }
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : `Unable to ${action} account.`
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function viewDetails(userId: string) {
    setDetailsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to load user details.");
      }
      setSelectedUser(result.data);
    } catch (detailsError) {
      setError(
        detailsError instanceof Error
          ? detailsError.message
          : "Unable to load user details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  const currentPage = pagination.totalPages
    ? Math.min(page, pagination.totalPages)
    : 1;

  return (
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-teal-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Users (Customers)</h1>
            <p className="mt-2 text-sm text-slate-400">
              View and manage registered customer accounts.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3 shadow-sm">
            <p className="text-xs text-slate-400">Total customers</p>
            <p className="text-2xl font-bold text-teal-400">{pagination.total}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px]">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search customer name or email..."
              aria-label="Search customers by name or email"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-950"
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by account status"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500"
            >
              <option value="all">All account statuses</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-300">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-300">
              {success}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-slate-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-slate-400">No customers found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-4">Customer</th>
                    <th className="px-3 py-4">Phone</th>
                    <th className="px-3 py-4">Status</th>
                    <th className="px-3 py-4">Registered</th>
                    <th className="px-3 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const name = [user.name, user.lastName].filter(Boolean).join(" ");
                    const isCurrentAdmin = user._id === currentUserId;
                    const isActive = user.isActive !== false;

                    return (
                      <tr key={user._id} className="border-b border-slate-800/60 transition hover:bg-slate-800/40">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-white">{name || "—"}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </td>
                        <td className="px-3 py-4 text-slate-300">{user.phone || "—"}</td>
                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? "border border-emerald-800 bg-emerald-950 text-emerald-300"
                                : "border border-rose-900 bg-rose-950 text-rose-300"
                            }`}
                          >
                            {isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-slate-300">{formatDate(user.createdAt)}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={detailsLoading}
                              onClick={() => void viewDetails(user._id)}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                            >
                              Details
                            </button>
                            {!isCurrentAdmin && (
                              <button
                                type="button"
                                disabled={updatingId === user._id}
                                onClick={() => void changeStatus(user)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
                                  isActive
                                    ? "border border-rose-900 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50"
                                    : "bg-teal-600 hover:bg-teal-500"
                                }`}
                              >
                                {updatingId === user._id
                                  ? "Updating..."
                                  : isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-400">
              {pagination.total
                ? `Page ${currentPage} of ${pagination.totalPages}`
                : "No matching accounts"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || currentPage <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => Math.max(1, value - 1));
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loading || currentPage >= pagination.totalPages}
                onClick={() => {
                  setLoading(true);
                  setPage((value) => value + 1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-900 bg-teal-950 text-xl font-bold text-teal-400">
                  {selectedUser.profileImage ? (
                    <TourImage
                      images={[selectedUser.profileImage]}
                      alt="User profile"
                      className="object-cover"
                    />
                  ) : (
                    (selectedUser.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
                    Customer details
                  </p>
                  <h2 id="user-details-title" className="mt-2 text-2xl font-bold text-white">
                    {[selectedUser.name, selectedUser.lastName].filter(Boolean).join(" ")}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="Close user details"
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <dt className="text-slate-400">Email</dt>
                <dd className="break-all text-right font-medium text-slate-200">{selectedUser.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <dt className="text-slate-400">Phone</dt>
                <dd className="text-right font-medium text-slate-200">{selectedUser.phone || "Not provided"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <dt className="text-slate-400">Account status</dt>
                <dd className="font-medium text-slate-200">
                  {selectedUser.isActive !== false ? "Active" : "Deactivated"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <dt className="text-slate-400">Registration date</dt>
                <dd className="font-medium text-slate-200">{formatDate(selectedUser.createdAt)}</dd>
              </div>
            </dl>

            {selectedUser._id !== currentUserId && (
              <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={updatingId === selectedUser._id}
                  onClick={() => void changeStatus(selectedUser)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                    selectedUser.isActive !== false
                      ? "border border-rose-900 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50"
                      : "bg-teal-600 hover:bg-teal-500"
                  }`}
                >
                  {updatingId === selectedUser._id
                    ? "Updating..."
                    : selectedUser.isActive !== false
                    ? "Deactivate Account"
                    : "Activate Account"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}