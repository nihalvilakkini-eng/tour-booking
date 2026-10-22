
"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

type Row = Record<string, unknown>;

type Props = {
  title: string;
  description: string;
  endpoint: string;
  fields: { key: string; label: string }[];
};

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map(display).join(", ");
    const item = value as Record<string, unknown>;
    return String(item.name ?? item.title ?? item.email ?? item._id ?? "—");
  }
  return String(value);
}

function extractRows(result: Record<string, unknown>): Row[] {
  const data = (result.data ?? result) as Record<string, unknown>;

  if (Array.isArray(data)) return data as Row[];

  for (const key of [
    "items", "tours", "bookings", "availability",
    "reviews", "notifications", "results",
  ]) {
    if (Array.isArray(data[key])) return data[key] as Row[];
  }

  return [];
}

export default function OperatorResourcePage({
  title,
  description,
  endpoint,
  fields,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? `Request failed: ${response.status}`);
      }

      setRows(extractRows(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((row) =>
    fields.some(({ key }) =>
      display(row[key]).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">WAYORA PARTNER</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">{title} list</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading..." : `${filtered.length} record(s)`}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full bg-transparent text-sm outline-none sm:w-56"
            />
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Loading records...
          </p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-800">No records found</p>
            <p className="mt-2 text-sm text-slate-500">
              Records will appear when the API returns matching data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {fields.map((field) => (
                    <th key={field.key} className="px-5 py-4 font-semibold">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, index) => (
                  <tr
                    key={String(row._id ?? row.id ?? index)}
                    className="hover:bg-slate-50"
                  >
                    {fields.map((field) => (
                      <td key={field.key} className="max-w-xs px-5 py-4">
                        {display(row[field.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
