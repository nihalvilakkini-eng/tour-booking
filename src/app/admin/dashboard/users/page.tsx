"use client";

import { useEffect, useState } from "react";

type User = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "operator" | "admin";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users.");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function changeRole(user: User, role: "user" | "operator") {
    const action =
      role === "operator" ? "promote this user to operator" : "remove operator access";

    if (!window.confirm(`Are you sure you want to ${action} for ${user.name}?`)) {
      return;
    }

    try {
      setUpdatingId(user._id);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/admin/users/${user._id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Role update failed.");
      }

      setSuccess(`${user.name}'s role was updated to ${role}.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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
            <h1 className="mt-2 text-3xl font-bold">Users Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage accounts and assign operator access.
            </p>
          </div>

          <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Registered users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or role..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e] focus:ring-2 focus:ring-[#087f6e]/10"
          />

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              {success}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No users found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-4">User</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b border-gray-50">
                      <td className="px-4 py-5 font-semibold">{user.name}</td>
                      <td className="px-4 py-5 text-gray-600">{user.email}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : user.role === "operator"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        {user.role === "user" && (
                          <button
                            type="button"
                            disabled={updatingId === user._id}
                            onClick={() => changeRole(user, "operator")}
                            className="rounded-lg bg-[#087f6e] px-4 py-2 font-semibold text-white hover:bg-[#066354] disabled:opacity-50"
                          >
                            {updatingId === user._id
                              ? "Updating..."
                              : "Promote to Operator"}
                          </button>
                        )}

                        {user.role === "operator" && (
                          <button
                            type="button"
                            disabled={updatingId === user._id}
                            onClick={() => changeRole(user, "user")}
                            className="rounded-lg border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Remove Operator
                          </button>
                        )}

                        {user.role === "admin" && (
                          <span className="text-gray-400">Protected account</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}