"use client";

import { useEffect, useState, useCallback } from "react";
import ChatInterface, { ConversationItem } from "@/components/chat/ChatInterface";
import { MessageSquare, ShieldAlert, Loader2 } from "lucide-react";

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
      setCurrentUser({ id: userData.data.id || userData.data.userId || userData.data._id, role: "operator" });

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
      <div className="flex h-96 items-center justify-center rounded-2xl border border-white/10 bg-[#121a22]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
        {error || "Unable to access operator messages."}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-white">
            <MessageSquare className="text-amber-400" size={24} />
            Messages
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Communicate with your booking customers and reach Wayora Admin directly.
          </p>
        </div>

        <button
          onClick={handleContactAdmin}
          disabled={startingAdminChat}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-300 shadow-sm transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          {startingAdminChat ? (
            <Loader2 size={14} className="animate-spin text-amber-400" />
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