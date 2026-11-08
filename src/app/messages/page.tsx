"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ChatInterface, { ConversationItem } from "@/components/chat/ChatInterface";
import { MessageSquare, AlertCircle, Compass } from "lucide-react";
import Link from "next/link";

export default function CustomerMessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: "user" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      // 1. Fetch user profile
      const userRes = await fetch("/api/auth/profile", {
        credentials: "include",
        cache: "no-store",
      });
      const userData = await userRes.json();
      if (!userRes.ok || !userData.success) {
        throw new Error("Please log in to access messages");
      }
      setCurrentUser({ id: userData.data.userId || userData.data._id, role: "user" });

      // If bookingIdParam is present, automatically ensure conversation exists
      if (bookingIdParam) {
        await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "customer_operator", bookingId: bookingIdParam }),
        });
      }

      // 2. Fetch conversations
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
  }, [bookingIdParam]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-700 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Loading messaging center...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !currentUser) {
    return (
      <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h2 className="text-base font-bold text-red-900">Access Restricted</h2>
          <p className="mt-1 text-sm text-red-700">{error || "Please sign in as a traveller."}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-teal-700" size={24} />
              Messages
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct and secure communication with tour operators assigned to your bookings.
            </p>
          </div>
          <Link
            href="/bookings"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            View Bookings
          </Link>
        </div>

        <ChatInterface
          currentRole="user"
          currentUserId={currentUser.id}
          initialConversations={conversations}
          preselectedConversationId={
            bookingIdParam
              ? conversations.find((c) => c.booking?._id === bookingIdParam)?._id
              : undefined
          }
          onRefreshConversations={() => void loadData()}
        />
      </div>
    </main>
  );
}
