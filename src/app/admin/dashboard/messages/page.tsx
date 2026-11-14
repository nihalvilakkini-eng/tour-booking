"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface, { ConversationItem } from "@/components/chat/ChatInterface";
import { MessageSquare, ArrowLeft, ShieldAlert } from "lucide-react";

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: "admin" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const userRes = await fetch("/api/auth/profile", {
        credentials: "include",
        cache: "no-store",
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.success || userData.data.role !== "admin") {
        throw new Error("Admin authorization required");
      }
      setCurrentUser({ id: userData.data.id || userData.data.userId || userData.data._id, role: "admin" });

      const convRes = await fetch("/api/conversations", {
        credentials: "include",
        cache: "no-store",
      });
      const convData = await convRes.json();
      if (!convRes.ok || !convData.success) {
        throw new Error(convData.message || "Failed to load conversations");
      }

      setConversations(convData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b1116] p-6 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-400">Loading admin messages...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !currentUser) {
    return (
      <main className="min-h-screen bg-[#0b1116] p-6 text-slate-100">
        <div className="mx-auto max-w-md rounded-2xl border border-rose-900 bg-rose-950/50 p-6 text-center text-rose-300 text-sm">
          {error || "Admin authentication required."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1116] p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/dashboard"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 transition"
                title="Back to Dashboard"
              >
                <ArrowLeft size={18} />
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-teal-400" size={24} />
                Operator Messages
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 ml-8">
              Direct private communications with approved tour operators.
            </p>
          </div>

          <Link
            href="/admin/dashboard/operators"
            className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 shadow-sm"
          >
            Manage Operators
          </Link>
        </div>

        <ChatInterface
          currentRole="admin"
          currentUserId={currentUser.id}
          initialConversations={conversations}
          onRefreshConversations={() => void loadData()}
        />
      </div>
    </main>
  );
}