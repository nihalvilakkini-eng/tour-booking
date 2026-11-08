"use client";

import { useEffect, useState, useCallback } from "react";
import ChatInterface, { ConversationItem } from "@/components/chat/ChatInterface";
import { MessageSquare, ShieldAlert, Plus, Loader2 } from "lucide-react";

export default function OperatorMessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: "operator" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingAdminChat, setStartingAdminChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const userRes = await fetch("/api/auth/profile", {
        credentials: "include",
        cache: "no-store",
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.success) {
        throw new Error("Please log in as an operator");
      }
      setCurrentUser({ id: userData.data.userId || userData.data._id, role: "operator" });

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

  // Start private conversation with Admin
  const handleContactAdmin = async () => {
    if (startingAdminChat) return;
    setStartingAdminChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "operator_admin" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadData();
      } else {
        alert(data.message || "Could not start admin chat");
      }
    } catch (err) {
      console.error("Contact admin error:", err);
    } finally {
      setStartingAdminChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 text-sm">
        {error || "Unable to access operator messages."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-teal-700" size={24} />
            Messages
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Communicate with your booking customers and reach Wayora Admin directly.
          </p>
        </div>

        <button
          onClick={handleContactAdmin}
          disabled={startingAdminChat}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {startingAdminChat ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ShieldAlert size={14} className="text-amber-400" />
          )}
          <span>Message Admin</span>
        </button>
      </div>

      <ChatInterface
        currentRole="operator"
        currentUserId={currentUser.id}
        initialConversations={conversations}
        onRefreshConversations={() => void loadData()}
      />
    </div>
  );
}
