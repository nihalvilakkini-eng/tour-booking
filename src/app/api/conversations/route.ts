import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Booking from "@/models/Booking";
import Tour from "@/models/Tour";
import User from "@/models/User";
import Message from "@/models/message";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

// ====================================================
// GET: List all conversations the user is authorized for
// ====================================================
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

    let query: Record<string, unknown> = {};

    if (role === "user") {
      // Customers can ONLY see their customer_operator conversations
      query = {
        type: "customer_operator",
        customer: userObjectId,
      };
    } else if (role === "operator") {
      // Operators can see both customer_operator (where they are operator)
      // and operator_admin (where they are operator)
      query = {
        operator: userObjectId,
        type: { $in: ["customer_operator", "operator_admin"] },
      };
    } else if (role === "admin") {
      // Admins can ONLY see operator_admin conversations. NEVER customer conversations!
      query = {
        type: "operator_admin",
      };
    } else {
      return NextResponse.json(
        { success: false, message: "Unauthorized role" },
        { status: 403 }
      );
    }

    const conversations = await Conversation.find(query)
      .populate("customer", "name lastName email role profileImage")
      .populate("operator", "name lastName email role profileImage operatorApplication")
      .populate("admin", "name lastName email role profileImage")
      .populate({
        path: "booking",
        select: "customerName bookingDate startTime participants status paymentStatus tour",
        populate: {
          path: "tour",
          select: "title destination images price currency",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Accurately compute unread counts per conversation directly from Message collection
    const convIds = conversations.map((c) => c._id);
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convIds },
          senderId: { $ne: userObjectId },
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = new Map<string, number>();
    for (const item of unreadAgg) {
      unreadMap.set(item._id.toString(), item.count);
    }

    const sanitizedConversations = conversations.map((conv) => {
      const convIdStr = conv._id.toString();
      const currentUnread = unreadMap.get(convIdStr) || 0;
      return {
        ...conv,
        unreadCounts: {
          ...(conv.unreadCounts instanceof Map
            ? Object.fromEntries(conv.unreadCounts.entries())
            : (conv.unreadCounts as Record<string, number>) || {}),
          [userId]: currentUnread,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: sanitizedConversations,
    });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// ====================================================
// POST: Create or retrieve conversation
// Allowed:
// 1. Customer -> Operator (Requires bookingId where user is booking customer)
// 2. Operator -> Admin (type: "operator_admin")
// 3. Admin -> Operator (type: "operator_admin", operatorId provided)
// FORBIDDEN: Customer -> Admin, Admin -> Customer
// ====================================================
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { type, bookingId, operatorId } = body;
    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    // ----------------------------------------------------
    // Scenario 1: Customer <-> Operator for a booking
    // ----------------------------------------------------
    if (authUser.role === "user" || type === "customer_operator") {
      if (authUser.role !== "user" && authUser.role !== "operator") {
        return NextResponse.json(
          { success: false, message: "Admin cannot initiate customer conversations" },
          { status: 403 }
        );
      }

      if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
        return NextResponse.json(
          { success: false, message: "A valid bookingId is required for customer conversations" },
          { status: 400 }
        );
      }

      const booking = await Booking.findById(bookingId).lean();
      if (!booking) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }

      const tour = await Tour.findById(booking.tour).lean();
      if (!tour || !tour.operator) {
        return NextResponse.json(
          { success: false, message: "Assigned tour operator not found" },
          { status: 404 }
        );
      }

      // Check ownership
      const isBookingCustomer = booking.user.toString() === authUser.userId;
      const isTourOperator = tour.operator.toString() === authUser.userId;

      if (!isBookingCustomer && !isTourOperator) {
        return NextResponse.json(
          { success: false, message: "You are not authorized for this booking conversation" },
          { status: 403 }
        );
      }

      const customerId = booking.user;
      const assignedOperatorId = tour.operator;

      // Find or create existing conversation for this booking
      let conversation = await Conversation.findOne({
        type: "customer_operator",
        booking: booking._id,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: "customer_operator",
          booking: booking._id,
          customer: customerId,
          operator: assignedOperatorId,
          participants: [customerId, assignedOperatorId],
          unreadCounts: {},
        });
      }

      const populated = await Conversation.findById(conversation._id)
        .populate("customer", "name lastName email role profileImage")
        .populate("operator", "name lastName email role profileImage operatorApplication")
        .populate({
          path: "booking",
          select: "customerName bookingDate startTime participants status paymentStatus tour",
          populate: {
            path: "tour",
            select: "title destination images price currency",
          },
        })
        .lean();

      return NextResponse.json({
        success: true,
        data: populated,
      });
    }

    // ----------------------------------------------------
    // Scenario 2: Operator <-> Admin
    // ----------------------------------------------------
    if (type === "operator_admin" || authUser.role === "admin" || authUser.role === "operator") {
      let targetOperatorId: mongoose.Types.ObjectId;

      if (authUser.role === "operator") {
        targetOperatorId = userObjectId;
      } else if (authUser.role === "admin") {
        if (!operatorId || !mongoose.isValidObjectId(operatorId)) {
          return NextResponse.json(
            { success: false, message: "A valid operatorId is required" },
            { status: 400 }
          );
        }
        targetOperatorId = new mongoose.Types.ObjectId(operatorId);
      } else {
        // Customer attempting to initiate operator_admin
        return NextResponse.json(
          { success: false, message: "Customers cannot message Admin" },
          { status: 403 }
        );
      }

      // Find an admin user to associate or use existing admin
      const adminUser = await User.findOne({ role: "admin" }).select("_id").lean();
      const adminObjectId = authUser.role === "admin" ? userObjectId : adminUser?._id;

      // Check if conversation already exists between this operator and admin
      let conversation = await Conversation.findOne({
        type: "operator_admin",
        operator: targetOperatorId,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          type: "operator_admin",
          operator: targetOperatorId,
          admin: adminObjectId,
          participants: adminObjectId ? [targetOperatorId, adminObjectId] : [targetOperatorId],
          unreadCounts: {},
        });
      } else if (authUser.role === "admin" && !conversation.admin) {
        conversation.admin = userObjectId;
        if (!conversation.participants.some((p) => p.toString() === authUser.userId)) {
          conversation.participants.push(userObjectId);
        }
        await conversation.save();
      }

      const populated = await Conversation.findById(conversation._id)
        .populate("operator", "name lastName email role profileImage operatorApplication")
        .populate("admin", "name lastName email role profileImage")
        .lean();

      return NextResponse.json({
        success: true,
        data: populated,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid conversation request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create or fetch conversation" },
      { status: 500 }
    );
  }
}
