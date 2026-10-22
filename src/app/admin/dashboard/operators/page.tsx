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
};

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    } ${operator.email} ${operator.phone ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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
          <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Total operators</p>
            <p className="text-2xl font-bold text-[#087f6e]">{operators.length}</p>
          </div>
        </div>

        <section className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
          />

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading operators...</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-gray-500">No operators found.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-500">
                    <th className="px-4 py-4">Operator</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Phone</th>
                    <th className="px-4 py-4">Joined</th>
                    <th className="px-4 py-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((operator) => {
                    const name =
                      operator.name ||
                      `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() ||
                      "Unnamed operator";

                    return (
                      <tr key={operator._id} className="border-b border-gray-50">
                        <td className="px-4 py-5 font-semibold">{name}</td>
                        <td className="px-4 py-5 text-gray-600">{operator.email}</td>
                        <td className="px-4 py-5 text-gray-600">
                          {operator.phone || "—"}
                        </td>
                        <td className="px-4 py-5 text-gray-600">
                          {operator.createdAt
                            ? new Date(operator.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-5">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Operator
                          </span>
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