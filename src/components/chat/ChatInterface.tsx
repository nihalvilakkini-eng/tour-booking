"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Send,
  Check,
  CheckCheck,
  Circle,
  MessageSquare,
  Calendar,
  Compass,
  User,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
import { getAblyRealtimeClient } from "@/lib/ably-client";

export type ParticipantUser = {
  _id: string;
  name?: string;
  lastName?: string;
  email: string;
  role: "user" | "operator" | "admin";
  profileImage?: string;
  operatorApplication?: {
    businessName?: string;
    businessType?: string;
  };
};

export type ConversationItem = {
  _id: string;
  type: "customer_operator" | "operator_admin";
  customer?: ParticipantUser;
  operator: ParticipantUser;
  admin?: ParticipantUser;
  booking?: {
    _id: string;
    customerName?: string;
    bookingDate?: string;
    startTime?: string;
    participants?: number;
    status?: string;
    paymentStatus?: string;
    tour?: {
      _id: string;
      title: string;
      destination?: string;
      images?: string[];
      price?: number;
      currency?: string;
    };
  };
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSender?: string;
  unreadCounts?: Record<string, number>;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: ParticipantUser | string;
  receiverId?: ParticipantUser | string;
  bookingId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

interface ChatInterfaceProps {
  currentRole: "user" | "operator" | "admin";
  currentUserId: string;
  initialConversations: ConversationItem[];
  preselectedConversationId?: string;
  onRefreshConversations?: () => void;
}

export default function ChatInterface({
  currentRole,
  currentUserId,
  initialConversations,
  preselectedConversationId,
  onRefreshConversations,
}: ChatInterfaceProps) {
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string>(
    preselectedConversationId || initialConversations[0]?._id || ""
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("connecting");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setConversations(initialConversations);
    if (!selectedId && initialConversations.length > 0) {
      setSelectedId(preselectedConversationId || initialConversations[0]._id);
    }
  }, [initialConversations, preselectedConversationId, selectedId]);

  const selectedConv = conversations.find((c) => c._id === selectedId);

  // Identify counterpart
  const counterpart: ParticipantUser | undefined = (() => {
    if (!selectedConv) return undefined;
    if (selectedConv.type === "customer_operator") {
      return currentRole === "user" ? selectedConv.operator : selectedConv.customer;
    }
    if (selectedConv.type === "operator_admin") {
      return currentRole === "operator" ? selectedConv.admin : selectedConv.operator;
    }
    return undefined;
  })();

  const counterpartName = (() => {
    if (!counterpart) return "Chat";
    if (counterpart.role === "admin") return "Wayora Admin";
    if (counterpart.operatorApplication?.businessName) {
      return counterpart.operatorApplication.businessName;
    }
    return `${counterpart.name || ""} ${counterpart.lastName || ""}`.trim() || counterpart.email;
  })();

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Fetch message history for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages(data.data);
      } else {
        setMessages([]);
      }

      // Mark as read
      await fetch(`/api/conversations/${convId}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      // Dispatch event to update navbar/sidebar badges immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wayora-message-change"));
      }

      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === convId) {
            return {
              ...c,
              unreadCounts: { ...(c.unreadCounts || {}), [currentUserId]: 0 },
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [currentUserId, scrollToBottom]);

  useEffect(() => {
    if (selectedId) {
      void loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping, scrollToBottom]);

  // Real-time Ably integration for channel messages, presence, and typing
  useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    const realtime = getAblyRealtimeClient();
    const channelName = `chat:conv-${selectedId}`;
    const channel = realtime.channels.get(channelName);

    setConnectionStatus(realtime.connection.state);

    const onConnChange = (stateChange: any) => {
      if (isMounted) setConnectionStatus(stateChange.current);
    };
    realtime.connection.on(onConnChange);

    // Subscribe to new incoming messages
    channel.subscribe("new-message", (msg) => {
      const newMsg = msg.data as ChatMessage;
      if (!newMsg || !newMsg._id) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      // If message is from other user, mark as read
      const senderIdStr =
        typeof newMsg.senderId === "string"
          ? newMsg.senderId
          : newMsg.senderId?._id;

      if (senderIdStr !== currentUserId) {
        if (selectedId === newMsg.conversationId) {
          void fetch(`/api/conversations/${selectedId}/read`, {
            method: "PATCH",
            credentials: "include",
          }).then(() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("wayora-message-change"));
            }
          });
        }
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("wayora-message-change"));
        }
      }

      // Update last message & unread counts in conversation list
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === newMsg.conversationId) {
            const isCurrentActive = c._id === selectedId;
            const currentUnread = c.unreadCounts?.[currentUserId] || 0;
            const nextUnread =
              senderIdStr === currentUserId || isCurrentActive
                ? 0
                : currentUnread + 1;

            return {
              ...c,
              lastMessage: newMsg.content,
              lastMessageAt: newMsg.createdAt,
              unreadCounts: {
                ...(c.unreadCounts || {}),
                [currentUserId]: nextUnread,
              },
            };
          }
          return c;
        })
      );
    });

    // Typing indicators
    channel.subscribe("typing", (msg) => {
      if (msg.clientId === currentUserId) return;
      const { typing } = msg.data || {};
      setOtherUserTyping(Boolean(typing));
    });

    // Presence (online/offline)
    channel.presence.subscribe("enter", (member) => {
      if (member.clientId !== currentUserId) setOtherUserOnline(true);
    });
    channel.presence.subscribe("present", (member) => {
      if (member.clientId !== currentUserId) setOtherUserOnline(true);
    });
    channel.presence.subscribe("leave", (member) => {
      if (member.clientId !== currentUserId) setOtherUserOnline(false);
    });

    // Enter presence
    channel.presence.enter({ role: currentRole });

    // Check existing presence
    channel.presence.get().then((members) => {
      const hasOther = members.some((m) => m.clientId !== currentUserId);
      if (isMounted) setOtherUserOnline(hasOther);
    }).catch(() => {});

    return () => {
      isMounted = false;
      realtime.connection.off(onConnChange);
      channel.presence.leave().catch(() => {});
      channel.unsubscribe();
      channel.presence.unsubscribe();
    };
  }, [selectedId, currentUserId, currentRole]);

  // Handle Typing indicator broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!selectedId) return;
    const channel = getAblyRealtimeClient().channels.get(`chat:conv-${selectedId}`);

    if (!isTyping) {
      setIsTyping(true);
      channel.publish("typing", { typing: true }).catch(() => {});
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      channel.publish("typing", { typing: false }).catch(() => {});
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !selectedId || sending) return;

    setSending(true);
    setInputText("");

    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    const channel = getAblyRealtimeClient().channels.get(`chat:conv-${selectedId}`);
    channel.publish("typing", { typing: false }).catch(() => {});

    try {
      // 1. Save to MongoDB permanently
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send message");
      }

      const savedMessage: ChatMessage = data.data;

      // 2. Broadcast via Ably channel for instant delivery
      channel.publish("new-message", savedMessage).catch((err) => {
        console.error("Ably broadcast error:", err);
      });

      // Add to local state if not added yet
      setMessages((prev) => {
        if (prev.some((m) => m._id === savedMessage._id)) return prev;
        return [...prev, savedMessage];
      });

      // Update conversations list locally
      setConversations((prev) =>
        prev.map((c) =>
          c._id === selectedId
            ? {
                ...c,
                lastMessage: savedMessage.content,
                lastMessageAt: savedMessage.createdAt,
              }
            : c
        )
      );

      scrollToBottom();
    } catch (err) {
      console.error("Send message error:", err);
      // Restore input text on error
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[550px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ---------------- Conversation List (Sidebar) ---------------- */}
      <aside
        className={`w-full border-r border-slate-200 bg-slate-50 md:w-80 lg:w-96 flex flex-col shrink-0 ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
                <MessageSquare size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Messages</h2>
            </div>
            {onRefreshConversations && (
              <button
                onClick={onRefreshConversations}
                title="Refresh conversations"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <RefreshCw size={15} />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {currentRole === "user"
              ? "Chat directly with tour operators for your bookings"
              : currentRole === "operator"
              ? "Customer booking chats & Private Admin support"
              : "Direct conversations with tour operators"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="mt-1 text-xs">
                {currentRole === "user"
                  ? "Book a tour and message the operator from your bookings page."
                  : "Conversations will appear here when customers or admins reach out."}
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv._id === selectedId;
              const unread = conv.unreadCounts?.[currentUserId] || 0;

              let otherUser: ParticipantUser | undefined;
              if (conv.type === "customer_operator") {
                otherUser = currentRole === "user" ? conv.operator : conv.customer;
              } else {
                otherUser = currentRole === "operator" ? conv.admin : conv.operator;
              }

              const title =
                otherUser?.role === "admin"
                  ? "Wayora Admin"
                  : otherUser?.operatorApplication?.businessName ||
                    `${otherUser?.name || ""} ${otherUser?.lastName || ""}`.trim() ||
                    otherUser?.email ||
                    "User";

              return (
                <button
                  key={conv._id}
                  onClick={() => setSelectedId(conv._id)}
                  className={`w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-white ${
                    isSelected ? "bg-white border-l-4 border-teal-700 shadow-sm" : ""
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center overflow-hidden border border-slate-200">
                    {otherUser?.profileImage ? (
                      <Image
                        src={otherUser.profileImage}
                        alt={title}
                        fill
                        className="object-cover"
                      />
                    ) : otherUser?.role === "admin" ? (
                      <ShieldAlert size={20} className="text-teal-700" />
                    ) : (
                      title.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {title}
                      </p>
                      {conv.lastMessageAt && (
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {conv.booking?.tour?.title && (
                      <p className="text-[11px] font-medium text-teal-700 truncate mt-0.5">
                        📍 {conv.booking.tour.title}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 truncate pr-2">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ---------------- Chat Window ---------------- */}
      <section
        className={`flex-1 flex flex-col bg-[#efeae2]/30 bg-repeat ${
          !selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedConv ? (
          <>
            {/* Header */}
            <header className="border-b border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3 shadow-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedId("")}
                  className="md:hidden text-slate-500 hover:text-slate-800 p-1"
                >
                  ← Back
                </button>

                <div className="relative h-10 w-10 shrink-0 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center border border-slate-200 overflow-hidden">
                  {counterpart?.profileImage ? (
                    <Image
                      src={counterpart.profileImage}
                      alt={counterpartName}
                      fill
                      className="object-cover"
                    />
                  ) : counterpart?.role === "admin" ? (
                    <ShieldAlert size={18} className="text-teal-700" />
                  ) : (
                    counterpartName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {counterpartName}
                    </h3>
                    <span className="text-[11px] rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
                      {counterpart?.role === "operator"
                        ? "Tour Operator"
                        : counterpart?.role === "admin"
                        ? "Admin"
                        : "Customer"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <Circle
                      size={7}
                      className={`fill-current ${
                        otherUserOnline ? "text-emerald-500" : "text-slate-300"
                      }`}
                    />
                    <span className="text-slate-500">
                      {otherUserTyping
                        ? "Typing..."
                        : otherUserOnline
                        ? "Online"
                        : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Booking Context Pill */}
              {selectedConv.booking && (
                <div className="hidden lg:flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs text-teal-900">
                  <Compass size={14} className="text-teal-700 shrink-0" />
                  <div className="truncate max-w-[200px]">
                    <span className="font-semibold block truncate">
                      {selectedConv.booking.tour?.title || "Tour Booking"}
                    </span>
                    <span className="text-[10px] text-teal-700 block">
                      Booking #{selectedConv.booking._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {/* Privacy Warning Banner */}
              <div className="mx-auto max-w-md rounded-xl bg-amber-50/80 border border-amber-200/80 p-2.5 text-center text-xs text-amber-800">
                🔒 End-to-end authorized channel. Messages are stored securely.
              </div>

              {loadingMessages ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                </div>
              ) : messages.length === 0 ? (
                <div className="my-10 text-center text-slate-400">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">Say hello to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const senderIdStr =
                    typeof msg.senderId === "string"
                      ? msg.senderId
                      : msg.senderId?._id;
                  const isMine = String(senderIdStr || "") === String(currentUserId || "");

                  return (
                    <div
                      key={msg._id}
                      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative ${
                          isMine
                            ? "bg-[#005c4b] text-white rounded-tr-none"
                            : "bg-white text-slate-900 border border-slate-200/90 rounded-tl-none shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                          {msg.content}
                        </p>

                        <div
                          className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                            isMine ? "text-emerald-200/90" : "text-slate-400"
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine &&
                            (msg.isRead ? (
                              <CheckCheck size={14} className="text-[#53bdeb]" />
                            ) : (
                              <Check size={14} className="text-emerald-200" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing bubble */}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-none border border-slate-200 bg-white px-3.5 py-2 shadow-sm text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce [animation-delay:0.2s] rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce [animation-delay:0.4s] rounded-full bg-slate-400" />
                    <span className="ml-1 text-[11px]">
                      {counterpartName} is typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <footer className="border-t border-slate-200 bg-white p-3 sm:p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={`Message ${counterpartName}...`}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 transition"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare size={48} className="text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">
              Select a conversation
            </h3>
            <p className="max-w-sm text-xs text-slate-500 mt-1">
              Choose an existing chat from the left panel to start messaging in real-time.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
