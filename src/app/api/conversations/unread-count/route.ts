import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Message from "@/models/message";
import Conversation from "@/models/Conversation";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { role, userId } = authUser;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Determine conversations where user is an authorized participant
    let convFilter: Record<string, unknown> = {};
    if (role === "user") {
      convFilter = { type: "customer_operator", customer: userObjectId };
    } else if (role === "operator") {
      convFilter = { operator: userObjectId, type: { $in: ["customer_operator", "operator_admin"] } };
    } else if (role === "admin") {
      convFilter = { type: "operator_admin" };
    }

    const allowedConvIds = await Conversation.find(convFilter).distinct("_id");

    // Unread count: messages in authorized conversations, where receiver is the user (or admin in operator_admin), not read, and sender is NOT the user
    const unreadCount = await Message.countDocuments({
      conversationId: { $in: allowedConvIds },
      senderId: { $ne: userObjectId },
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/conversations/unread-count error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch unread count", unreadCount: 0 },
      { status: 500 }
    );
  }
}
