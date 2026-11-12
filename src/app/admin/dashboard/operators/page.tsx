"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Operator = {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
  createdAt?: string;
  operatorApplication?: {
    businessName?: string;
    businessType?: string;
    city?: string;
    status?: string;
  };
};

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadOperators() {
      try {
        const response = await fetch("/api/admin/operators", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load operators.");
        }

        const list = data.operators ?? data.users ?? data.data ?? [];
        setOperators(
          Array.isArray(list)
            ? list.filter((item: Operator) => item.role === "operator")
            : []
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load operators.");
      } finally {
        setLoading(false);
      }
    }

    void loadOperators();
  }, []);

  const filtered = operators.filter((operator) =>
    `${operator.name ?? ""} ${operator.firstName ?? ""} ${
      operator.lastName ?? ""
    } ${operator.email} ${operator.phone ?? ""} ${
      operator.operatorApplication?.businessName ?? ""
    }`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Operator-നെ Deactivate ചെയ്ത് സാധാരണ User ആക്കി മാറ്റാൻ
  const handleDeactivateOperator = async (operator: Operator) => {
    const name =
      operator.name ||
      `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() ||
      operator.email;

    if (
      !window.confirm(
        `Are you sure you want to deactivate ${name} as an Operator? Their operator role will be removed and they will be moved to the Users list.`
      )
    ) {
      return;
    }

    try {
      setUpdatingId(operator._id);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/admin/users/${operator._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "user", isActive: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to deactivate operator.");
      }

      // Operators ലിസ്റ്റിൽ നിന്നും ഒഴിവാക്കുക (ഇപ്പോൾ ഇവർ Users പേജിലേക്ക് മാറിയിട്ടുണ്ടാകും)
      setOperators((prev) => prev.filter((op) => op._id !== operator._id));
      setSuccess(`${name} has been deactivated as an operator and moved to Users.`);
    } catch (err) {
      console.error("Deactivate operator error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong while updating operator."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/dashboard" className="text-sm font-semibold text-[#087f6e] hover:underline">
          ← Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Operators</h1>
            <p className="mt-2 text-sm text-gray-500">
              View and manage registered tour operators.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/dashboard/operator-applications"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
            >
              📋 Review Applications →
            </Link>
            <div className="rounded-xl bg-white px-5 py-3 shadow-sm">
              <p className="text-xs text-gray-500">Approved operators</p>
              <p className="text-2xl font-bold text-[#087f6e]">{operators.length}</p>
            </div>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, business name, email or phone..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
          />

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
              {success}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading operators...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No operators found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-4 py-4">Operator</th>
                    <th className="px-4 py-4">Business</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Phone</th>
                    <th className="px-4 py-4">Joined</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((operator) => {
                    const name =
                      operator.name ||
                      `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() ||
                      "Unnamed operator";

                    const isUpdating = updatingId === operator._id;

                    return (
                      <tr key={operator._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-semibold">{name}</td>
                        <td className="px-4 py-5 font-medium text-gray-700">
                          {operator.operatorApplication?.businessName || "—"}
                        </td>
                        <td className="px-4 py-5 text-gray-600">{operator.email}</td>
                        <td className="px-4 py-5 text-gray-600">
                          {operator.phone || "—"}
                        </td>
                        <td className="px-4 py-5 text-gray-600">
                          {operator.createdAt
                            ? new Date(operator.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-5 text-right">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleDeactivateOperator(operator)}
                            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                          >
                            {isUpdating ? "Deactivating..." : "Deactivate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}