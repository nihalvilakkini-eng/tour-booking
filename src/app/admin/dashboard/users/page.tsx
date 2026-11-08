"use client";

import { useEffect, useState } from "react";
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

const roleLabel: Record<UserRole, string> = {
  user: "Customer",
  operator: "Operator",
  admin: "Admin",
};

async function fetchUsers(
  search: string,
  role: string,
  status: string,
  page: number,
  signal: AbortSignal
): Promise<UserPage> {
  const params = new URLSearchParams({
    search,
    role,
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

  return {
    users: Array.isArray(result.users) ? result.users : [],
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
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchUsers(search, roleFilter, statusFilter, page, controller.signal)
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
  }, [page, refreshKey, roleFilter, search, statusFilter]);

  async function changeStatus(user: User) {
    if (user._id === currentUserId) return;
    const nextIsActive = !user.isActive;
    const action = nextIsActive ? "activate" : "deactivate";
    const name = [user.name, user.lastName].filter(Boolean).join(" ");

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
      setLoading(true);
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
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="/admin/dashboard"
          className="text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to Dashboard
        </a>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">User Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review account details and manage platform access.
            </p>
          </div>
          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Matching accounts</p>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_190px]">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, email or role..."
              aria-label="Search users by name, email or role"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e] focus:ring-2 focus:ring-[#087f6e]/10"
            />
            <select
              value={roleFilter}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setRoleFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by role"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All roles</option>
              <option value="user">Customers</option>
              <option value="operator">Operators</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by account status"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            >
              <option value="all">All account statuses</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {success}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No users found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Phone</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Account status</th>
                    <th className="px-4 py-4">Registered</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const name = [user.name, user.lastName].filter(Boolean).join(" ");
                    const isCurrentAdmin = user._id === currentUserId;
                    return (
                      <tr key={user._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-semibold">{name || "—"}</td>
                        <td className="px-4 py-5 text-gray-600">{user.email}</td>
                        <td className="px-4 py-5 text-gray-600">{user.phone || "—"}</td>
                        <td className="px-4 py-5">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {roleLabel[user.role] || user.role}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-gray-600">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={detailsLoading}
                              onClick={() => void viewDetails(user._id)}
                              className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              View Details
                            </button>
                            {!isCurrentAdmin && (
                              <button
                                type="button"
                                disabled={updatingId === user._id}
                                onClick={() => void changeStatus(user)}
                                className={`rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50 ${
                                  user.isActive
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-[#087f6e] hover:bg-[#066354]"
                                }`}
                              >
                                {updatingId === user._id
                                  ? "Updating..."
                                  : user.isActive
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

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
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
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#087f6e]/10 text-xl font-bold text-[#087f6e]">
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
                  <p className="text-xs font-bold uppercase tracking-widest text-[#087f6e]">
                    Account details
                  </p>
                  <h2 id="user-details-title" className="mt-2 text-2xl font-bold">
                    {[selectedUser.name, selectedUser.lastName].filter(Boolean).join(" ")}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="Close user details"
                className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-gray-500">Email</dt>
                <dd className="break-all text-right font-medium">{selectedUser.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-right font-medium">{selectedUser.phone || "Not provided"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-gray-500">Role</dt>
                <dd className="font-medium">{roleLabel[selectedUser.role] || selectedUser.role}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-gray-500">Account status</dt>
                <dd className="font-medium">{selectedUser.isActive ? "Active" : "Deactivated"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b pb-3">
                <dt className="text-gray-500">Registration date</dt>
                <dd className="font-medium">{formatDate(selectedUser.createdAt)}</dd>
              </div>
              {selectedUser.updatedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Last updated</dt>
                  <dd className="font-medium">{formatDate(selectedUser.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      )}
    </main>
  );
}
