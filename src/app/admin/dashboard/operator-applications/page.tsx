"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OperatorApplication = {
  businessName: string;
  businessType: string;
  businessDescription: string;
  phone: string;
  businessEmail: string;
  country: string;
  state: string;
  city: string;
  businessAddress: string;
  yearsOfExperience: number;
  website?: string;
  registrationNumber?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  reviewedBy?: {
    _id?: string;
    name?: string;
    lastName?: string;
    email?: string;
  } | null;
  reviewedAt?: string;
  submittedAt?: string;
};

type ApplicationRecord = {
  _id: string;
  name: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  createdAt: string;
  operatorApplication: OperatorApplication;
};

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function OperatorApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [rejectingApp, setRejectingApp] = useState<ApplicationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadApplications() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/operator-applications", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load applications.");
      }

      setApplications(result.data || []);
      if (result.counts) {
        setCounts(result.counts);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load operator applications."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();

    return applications.filter((app) => {
      if (!app.operatorApplication?.businessName) return false;
      const appStatus = app.operatorApplication?.status || "pending";
      const matchesFilter = filter === "all" || appStatus === filter;

      if (!matchesFilter) return false;

      if (!q) return true;

      const searchable = [
        app.name,
        app.lastName,
        app.email,
        app.phone,
        app.operatorApplication?.businessName,
        app.operatorApplication?.businessType,
        app.operatorApplication?.city,
        app.operatorApplication?.state,
        app.operatorApplication?.country,
        app.operatorApplication?.phone,
        app.operatorApplication?.businessEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [applications, filter, search]);

  async function handleApprove(app: ApplicationRecord) {
    if (!window.confirm(`Approve operator application for "${app.operatorApplication?.businessName || app.name}"?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/admin/operator-applications/${app._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to approve application.");
      }

      setSuccess(`Application for "${app.operatorApplication?.businessName}" approved! Operator role has been granted.`);
      await loadApplications();

      if (selectedApp?._id === app._id) {
        setSelectedApp(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectingApp) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/admin/operator-applications/${rejectingApp._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to reject application.");
      }

      setSuccess(`Application for "${rejectingApp.operatorApplication?.businessName}" rejected.`);
      setRejectingApp(null);
      setRejectionReason("");
      await loadApplications();

      if (selectedApp?._id === rejectingApp._id) {
        setSelectedApp(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(val?: string) {
    if (!val) return "—";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#0b1116] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-teal-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        {/* Top Header */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-400">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Operator Applications</h1>
            <p className="mt-2 text-sm text-slate-400">
              Review incoming business credentials and manage operator access permissions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadApplications()}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-teal-500 hover:bg-slate-700 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "all"
                ? "border-teal-500 bg-teal-950/40"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-slate-400">All Applications</p>
            <p className="mt-1 text-2xl font-bold text-white">{counts.all}</p>
          </button>

          <button
            onClick={() => setFilter("pending")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "pending"
                ? "border-amber-500 bg-amber-950/40"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-amber-400">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{counts.pending}</p>
          </button>

          <button
            onClick={() => setFilter("approved")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "approved"
                ? "border-emerald-500 bg-emerald-950/40"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-emerald-400">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{counts.approved}</p>
          </button>

          <button
            onClick={() => setFilter("rejected")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "rejected"
                ? "border-rose-500 bg-rose-950/40"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-rose-400">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-rose-300">{counts.rejected}</p>
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mt-6 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/50 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Filter and Search Bar */}
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, applicant, email, phone, city..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none focus:border-teal-500"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase transition ${
                    filter === s
                      ? "bg-teal-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <p className="py-16 text-center text-slate-400">Loading operator applications...</p>
          ) : filteredApplications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-lg font-medium text-slate-200">No applications found</p>
              <p className="mt-1 text-xs text-slate-500">
                {filter !== "all"
                  ? `There are no ${filter} applications.`
                  : "No operator registrations have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const applicantName = `${app.name} ${app.lastName || ""}`.trim();
                    const op = app.operatorApplication;
                    const status = op?.status || "pending";

                    return (
                      <tr
                        key={app._id}
                        className="border-b border-slate-800/60 transition hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-white">
                            {op?.businessName || "Unnamed Business"}
                          </p>
                          <span className="mt-1 inline-block rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                            {op?.businessType || "Other"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-200">{applicantName}</p>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-300">
                          <p>{op?.phone || app.phone || "—"}</p>
                          <p className="text-slate-500">{op?.businessEmail || "—"}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-300">
                          <p>{op?.city ? `${op.city}, ${op.state}` : "—"}</p>
                          <p className="text-slate-500">{op?.country || "—"}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-400">
                          {formatDate(op?.submittedAt || app.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          {status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800 bg-amber-950 px-3 py-1 text-xs font-bold text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Pending
                            </span>
                          )}
                          {status === "approved" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Approved
                            </span>
                          )}
                          {status === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-800 bg-rose-950 px-3 py-1 text-xs font-bold text-rose-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-xs hover:border-teal-500 hover:text-teal-300"
                            >
                              View
                            </button>

                            {status !== "approved" && (
                              <button
                                onClick={() => void handleApprove(app)}
                                disabled={actionLoading}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-500 disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}

                            {status !== "rejected" && (
                              <button
                                onClick={() => {
                                  setRejectingApp(app);
                                  setRejectionReason("");
                                }}
                                disabled={actionLoading}
                                className="rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 disabled:opacity-50"
                              >
                                Reject
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
        </section>

        {/* Full Details Modal */}
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8 text-slate-100">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedApp.operatorApplication?.businessName}
                    </h2>
                    <span className="rounded-full border border-teal-800 bg-teal-950 px-3 py-1 text-xs font-bold text-teal-300">
                      {selectedApp.operatorApplication?.businessType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Application ID: {selectedApp._id}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="my-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4 text-sm">
                <div>
                  <span className="text-xs uppercase text-slate-400">Application Status: </span>
                  <strong className="ml-1 uppercase text-teal-400">
                    {selectedApp.operatorApplication?.status}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Submitted: </span>
                  <span className="font-semibold text-slate-200">
                    {formatDate(selectedApp.operatorApplication?.submittedAt)}
                  </span>
                </div>
              </div>

              {selectedApp.operatorApplication?.status === "rejected" &&
                selectedApp.operatorApplication.rejectionReason && (
                  <div className="mb-5 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-300">
                    <strong>Rejection Reason: </strong>
                    <p className="mt-1">{selectedApp.operatorApplication.rejectionReason}</p>
                  </div>
                )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Business Info */}
                <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                  <h3 className="font-bold text-teal-400">Business Information</h3>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Business Name</p>
                      <p className="font-semibold text-white">{selectedApp.operatorApplication?.businessName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Business Type</p>
                      <p className="font-medium text-slate-200">{selectedApp.operatorApplication?.businessType}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Description</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {selectedApp.operatorApplication?.businessDescription}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Years of Experience</p>
                      <p className="font-semibold text-white">{selectedApp.operatorApplication?.yearsOfExperience} years</p>
                    </div>

                    {selectedApp.operatorApplication?.registrationNumber && (
                      <div>
                        <p className="text-xs text-slate-400">Registration Number</p>
                        <p className="font-mono text-xs text-slate-200">{selectedApp.operatorApplication.registrationNumber}</p>
                      </div>
                    )}

                    {selectedApp.operatorApplication?.website && (
                      <div>
                        <p className="text-xs text-slate-400">Website / Social</p>
                        <a
                          href={
                            selectedApp.operatorApplication.website.startsWith("http")
                              ? selectedApp.operatorApplication.website
                              : `https://${selectedApp.operatorApplication.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-teal-400 hover:underline"
                        >
                          {selectedApp.operatorApplication.website} ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applicant & Contact Info */}
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                    <h3 className="font-bold text-teal-400">Applicant Information</h3>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Full Name</p>
                        <p className="font-semibold text-white">
                          {selectedApp.name} {selectedApp.lastName || ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Personal / Account Email</p>
                        <p className="text-slate-200">{selectedApp.email}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Personal Phone</p>
                        <p className="text-slate-200">{selectedApp.phone || "—"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Current Role</p>
                        <p className="font-semibold uppercase text-xs text-slate-300">{selectedApp.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                    <h3 className="font-bold text-teal-400">Contact & Location</h3>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Business Email</p>
                        <p className="text-slate-200">{selectedApp.operatorApplication?.businessEmail}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Business Phone</p>
                        <p className="text-slate-200">{selectedApp.operatorApplication?.phone}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Address</p>
                        <p className="text-slate-200 leading-snug">
                          {selectedApp.operatorApplication?.businessAddress}
                        </p>
                        <p className="mt-1 font-medium text-xs text-slate-400">
                          {selectedApp.operatorApplication?.city},{" "}
                          {selectedApp.operatorApplication?.state},{" "}
                          {selectedApp.operatorApplication?.country}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review History */}
              {selectedApp.operatorApplication?.reviewedAt && (
                <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-400">
                  Reviewed on {formatDate(selectedApp.operatorApplication.reviewedAt)} by{" "}
                  {typeof selectedApp.operatorApplication.reviewedBy === "object" &&
                  selectedApp.operatorApplication.reviewedBy
                    ? `${selectedApp.operatorApplication.reviewedBy.name || ""} (${selectedApp.operatorApplication.reviewedBy.email || ""})`
                    : "Administrator"}
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Close
                </button>

                {selectedApp.operatorApplication?.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingApp(selectedApp);
                      setRejectionReason("");
                    }}
                    disabled={actionLoading}
                    className="rounded-xl border border-rose-900 bg-rose-950/40 px-5 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-900/50 disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                )}

                {selectedApp.operatorApplication?.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => void handleApprove(selectedApp)}
                    disabled={actionLoading}
                    className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-500 disabled:opacity-50"
                  >
                    Approve Application
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8 text-slate-100">
              <h3 className="text-xl font-bold text-white">Reject Application</h3>
              <p className="mt-1 text-xs text-slate-400">
                Rejecting application for:{" "}
                <strong className="text-slate-200">
                  {rejectingApp.operatorApplication?.businessName || rejectingApp.name}
                </strong>
              </p>

              <div className="mt-5">
                <label
                  htmlFor="rejectionReason"
                  className="block text-xs font-bold uppercase text-slate-300"
                >
                  Rejection Reason (Required)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this application was not approved (e.g. missing documentation, invalid business registration, unable to verify credentials)..."
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-900"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  This message will be sent in a notification to the applicant.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingApp(null);
                    setRejectionReason("");
                  }}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmReject()}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}