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

// ====================================================
// PATCH: Mark conversation messages as read for authenticated user
// ====================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
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
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify participant
    const isParticipant =
      conversation.customer?.toString() === authUser.userId ||
      conversation.operator?.toString() === authUser.userId ||
      (authUser.role === "admin" && conversation.type === "operator_admin");

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    // Mark messages where sender is NOT the current user as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        senderId: { $ne: userObjectId },
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      }
    );

    // Reset unread count for current user
    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(authUser.userId, 0);
      await conversation.save();
    }

    return NextResponse.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("PATCH /api/conversations/[id]/read error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
