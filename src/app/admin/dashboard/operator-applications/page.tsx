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
    <main className="min-h-screen bg-[#f5f8f7] px-4 py-8 text-[#172b27] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-[#087f6e] hover:underline"
        >
          ← Back to Dashboard
        </Link>

        {/* Top Header */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#087f6e]">
              WAYORA Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Operator Applications</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review incoming business credentials and manage operator access permissions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadApplications()}
              disabled={loading}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-[#087f6e]"
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
                ? "border-[#087f6e] bg-[#edf8f6]"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-gray-500">All Applications</p>
            <p className="mt-1 text-2xl font-bold">{counts.all}</p>
          </button>

          <button
            onClick={() => setFilter("pending")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "pending"
                ? "border-amber-500 bg-amber-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-amber-700">Pending Review</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{counts.pending}</p>
          </button>

          <button
            onClick={() => setFilter("approved")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "approved"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-emerald-700">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{counts.approved}</p>
          </button>

          <button
            onClick={() => setFilter("rejected")}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === "rejected"
                ? "border-rose-500 bg-rose-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <p className="text-xs font-semibold uppercase text-rose-700">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{counts.rejected}</p>
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Filter and Search Bar */}
        <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, applicant, email, phone, city..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#087f6e]"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase transition ${
                    filter === s
                      ? "bg-[#087f6e] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <p className="py-16 text-center text-gray-500">Loading operator applications...</p>
          ) : filteredApplications.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-lg font-medium">No applications found</p>
              <p className="mt-1 text-xs text-gray-400">
                {filter !== "all"
                  ? `There are no ${filter} applications.`
                  : "No operator registrations have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-gray-400">
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
                        className="border-b border-gray-50 transition hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-[#172b27]">
                            {op?.businessName || "Unnamed Business"}
                          </p>
                          <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                            {op?.businessType || "Other"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-gray-900">{applicantName}</p>
                          <p className="text-xs text-gray-500">{app.email}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-gray-600">
                          <p>{op?.phone || app.phone || "—"}</p>
                          <p className="text-gray-400">{op?.businessEmail || "—"}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-gray-600">
                          <p>{op?.city ? `${op.city}, ${op.state}` : "—"}</p>
                          <p className="text-gray-400">{op?.country || "—"}</p>
                        </td>

                        <td className="px-4 py-4 text-xs text-gray-500">
                          {formatDate(op?.submittedAt || app.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          {status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Pending
                            </span>
                          )}
                          {status === "approved" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Approved
                            </span>
                          )}
                          {status === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:border-[#087f6e] hover:text-[#087f6e]"
                            >
                              View
                            </button>

                            {status !== "approved" && (
                              <button
                                onClick={() => void handleApprove(app)}
                                disabled={actionLoading}
                                className="rounded-lg bg-[#087f6e] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#066354] disabled:opacity-50"
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
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-[#172b27]">
                      {selectedApp.operatorApplication?.businessName}
                    </h2>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      {selectedApp.operatorApplication?.businessType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Application ID: {selectedApp._id}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Status Banner */}
              <div className="my-5 flex items-center justify-between rounded-xl bg-[#f5f8f7] p-4 text-sm">
                <div>
                  <span className="text-xs uppercase text-gray-500">Application Status: </span>
                  <strong className="ml-1 uppercase text-[#087f6e]">
                    {selectedApp.operatorApplication?.status}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Submitted: </span>
                  <span className="font-semibold text-gray-700">
                    {formatDate(selectedApp.operatorApplication?.submittedAt)}
                  </span>
                </div>
              </div>

              {selectedApp.operatorApplication?.status === "rejected" &&
                selectedApp.operatorApplication.rejectionReason && (
                  <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <strong>Rejection Reason: </strong>
                    <p className="mt-1">{selectedApp.operatorApplication.rejectionReason}</p>
                  </div>
                )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Business Info */}
                <div className="rounded-2xl border border-gray-100 bg-[#fafcfa] p-5">
                  <h3 className="font-bold text-[#087f6e]">Business Information</h3>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Business Name</p>
                      <p className="font-semibold">{selectedApp.operatorApplication?.businessName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Business Type</p>
                      <p className="font-medium">{selectedApp.operatorApplication?.businessType}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {selectedApp.operatorApplication?.businessDescription}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Years of Experience</p>
                      <p className="font-semibold">{selectedApp.operatorApplication?.yearsOfExperience} years</p>
                    </div>

                    {selectedApp.operatorApplication?.registrationNumber && (
                      <div>
                        <p className="text-xs text-gray-400">Registration Number</p>
                        <p className="font-mono text-xs">{selectedApp.operatorApplication.registrationNumber}</p>
                      </div>
                    )}

                    {selectedApp.operatorApplication?.website && (
                      <div>
                        <p className="text-xs text-gray-400">Website / Social</p>
                        <a
                          href={
                            selectedApp.operatorApplication.website.startsWith("http")
                              ? selectedApp.operatorApplication.website
                              : `https://${selectedApp.operatorApplication.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#087f6e] hover:underline"
                        >
                          {selectedApp.operatorApplication.website} ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applicant & Contact Info */}
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-100 bg-[#fafcfa] p-5">
                    <h3 className="font-bold text-[#087f6e]">Applicant Information</h3>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Full Name</p>
                        <p className="font-semibold">
                          {selectedApp.name} {selectedApp.lastName || ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Personal / Account Email</p>
                        <p className="text-gray-800">{selectedApp.email}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Personal Phone</p>
                        <p className="text-gray-800">{selectedApp.phone || "—"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Current Role</p>
                        <p className="font-semibold uppercase text-xs text-gray-700">{selectedApp.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-[#fafcfa] p-5">
                    <h3 className="font-bold text-[#087f6e]">Contact & Location</h3>

                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Business Email</p>
                        <p className="text-gray-800">{selectedApp.operatorApplication?.businessEmail}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Business Phone</p>
                        <p className="text-gray-800">{selectedApp.operatorApplication?.phone}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Address</p>
                        <p className="text-gray-800 leading-snug">
                          {selectedApp.operatorApplication?.businessAddress}
                        </p>
                        <p className="mt-1 font-medium text-xs text-gray-600">
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
                <div className="mt-6 border-t pt-4 text-xs text-gray-500">
                  Reviewed on {formatDate(selectedApp.operatorApplication.reviewedAt)} by{" "}
                  {typeof selectedApp.operatorApplication.reviewedBy === "object" &&
                  selectedApp.operatorApplication.reviewedBy
                    ? `${selectedApp.operatorApplication.reviewedBy.name || ""} (${selectedApp.operatorApplication.reviewedBy.email || ""})`
                    : "Administrator"}
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
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
                    className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                )}

                {selectedApp.operatorApplication?.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => void handleApprove(selectedApp)}
                    disabled={actionLoading}
                    className="rounded-xl bg-[#087f6e] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#066354] disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <h3 className="text-xl font-bold text-[#172b27]">Reject Application</h3>
              <p className="mt-1 text-xs text-gray-500">
                Rejecting application for:{" "}
                <strong className="text-gray-800">
                  {rejectingApp.operatorApplication?.businessName || rejectingApp.name}
                </strong>
              </p>

              <div className="mt-5">
                <label
                  htmlFor="rejectionReason"
                  className="block text-xs font-bold uppercase text-gray-700"
                >
                  Rejection Reason (Required)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this application was not approved (e.g. missing documentation, invalid business registration, unable to verify credentials)..."
                  className="mt-2 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
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
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
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
