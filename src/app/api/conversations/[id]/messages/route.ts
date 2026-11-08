import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/message";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Verify user has authorization to view or post to this conversation
async function verifyConversationAccess(conversationId: string, authUser: { role: string; userId: string }) {
  if (!mongoose.isValidObjectId(conversationId)) return null;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;

  if (authUser.role === "admin") {
    // Admin can access ONLY operator_admin conversations
    if (conversation.type !== "operator_admin") return null;
    return conversation;
  }

  if (authUser.role === "operator") {
    // Operator can access conversations where they are the operator
    if (conversation.operator.toString() !== authUser.userId) return null;
    return conversation;
  }

  if (authUser.role === "user") {
    // Customer can access ONLY customer_operator conversations where they are the customer
    if (
      conversation.type !== "customer_operator" ||
      conversation.customer?.toString() !== authUser.userId
    ) {
      return null;
    }
    return conversation;
  }

  return null;
}

// ====================================================
// GET: Fetch message history for a conversation
// ====================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    const authUser = await getRequestUser(token);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const conversation = await verifyConversationAccess(id, authUser);
    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Conversation not found or unauthorized" },
        { status: 404 }
      );
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .populate("senderId", "name lastName email role profileImage")
      .populate("receiverId", "name lastName email role profileImage")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// ====================================================
// POST: Store a new message in MongoDB permanently
// Updates conversation lastMessage, lastMessageAt, unread counts
// ====================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    const authUser = await getRequestUser(token);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const conversation = await verifyConversationAccess(id, authUser);
    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Conversation not found or unauthorized" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    // Determine receiver
    let receiverId: mongoose.Types.ObjectId | undefined;
    if (conversation.type === "customer_operator") {
      if (authUser.userId === conversation.customer?.toString()) {
        receiverId = conversation.operator;
      } else {
        receiverId = conversation.customer;
      }
    } else if (conversation.type === "operator_admin") {
      if (authUser.role === "operator") {
        receiverId = conversation.admin;
      } else {
        receiverId = conversation.operator;
      }
    }

    const senderObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: senderObjectId,
      receiverId,
      bookingId: conversation.booking,
      content,
      isRead: false,
    });

    // Update conversation metadata & unread count
    conversation.lastMessage = content;
    conversation.lastMessageAt = new Date();
    conversation.lastMessageSender = senderObjectId;

    if (receiverId) {
      const rIdStr = receiverId.toString();
      const currentUnread = conversation.unreadCounts?.get(rIdStr) || 0;
      if (!conversation.unreadCounts) {
        conversation.unreadCounts = new Map();
      }
      conversation.unreadCounts.set(rIdStr, currentUnread + 1);
    }

    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate("senderId", "name lastName email role profileImage")
      .populate("receiverId", "name lastName email role profileImage")
      .lean();

    return NextResponse.json({
      success: true,
      data: populated,
    });
  } catch (error) {
    console.error("POST /api/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save message" },
      { status: 500 }
    );
  }
}
