import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";
import { createNotification } from "@/lib/notifications";
import { sendOperatorStatusEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const user = await getRequestUser(token);
  return user?.role === "admin" ? user : null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid application ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const application = await User.findById(id)
      .select("-password")
      .populate("operatorApplication.reviewedBy", "name lastName email")
      .lean();

    if (!application || !application.operatorApplication) {
      return NextResponse.json(
        { success: false, message: "Operator application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("ADMIN OPERATOR APPLICATION GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch operator application" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid application ID" },
        { status: 400 }
      );
    }

    let body: { action?: string; rejectionReason?: string; status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON body is required" },
        { status: 400 }
      );
    }

    const action = String(body.action || body.status || "").trim().toLowerCase();

    if (action !== "approve" && action !== "approved" && action !== "reject" && action !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          message: "Action must be either 'approve' or 'reject'",
        },
        { status: 400 }
      );
    }

    const isApprove = action === "approve" || action === "approved";
    const rejectionReason = String(body.rejectionReason ?? "").trim();

    if (!isApprove && !rejectionReason) {
      return NextResponse.json(
        {
          success: false,
          message: "Rejection reason is required when rejecting an application",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(id);

    if (!user || !user.operatorApplication) {
      return NextResponse.json(
        { success: false, message: "Operator application not found" },
        { status: 404 }
      );
    }

    const adminObjectId = new mongoose.Types.ObjectId(admin.userId);
    const reviewedAt = new Date();

    if (isApprove) {
      // Approve application:
      // Update user role to "operator"
      // Update application status to "approved"
      // Save reviewedBy and reviewedAt
      user.role = "operator";
      user.operatorApplication.status = "approved";
      user.operatorApplication.reviewedBy = adminObjectId;
      user.operatorApplication.reviewedAt = reviewedAt;
      user.operatorApplication.rejectionReason = "";

      await user.save();

      // Send notification to the applicant
      try {
        await createNotification({
          user: user._id,
          type: "operator_application_approved",
          title: "Operator Application Approved",
          message:
            "Congratulations! Your operator application has been approved. You now have full access to the Operator Dashboard and can start publishing tours.",
        });
      } catch (notifErr) {
        console.error("Failed to send approval notification:", notifErr);
      }

      await sendOperatorStatusEmail({
        to: user.email,
        name: user.name,
        businessName: user.operatorApplication.businessName,
        status: "approved",
      });

      return NextResponse.json({
        success: true,
        message: "Operator application approved successfully",
        data: {
          id: user._id,
          role: user.role,
          operatorApplication: user.operatorApplication,
        },
      });
    } else {
      // Reject application:
      // Keep role as "user"
      // Update status to "rejected"
      // Save rejection reason
      // Save reviewedBy and reviewedAt
      user.role = "user";
      user.operatorApplication.status = "rejected";
      user.operatorApplication.rejectionReason = rejectionReason;
      user.operatorApplication.reviewedBy = adminObjectId;
      user.operatorApplication.reviewedAt = reviewedAt;

      await user.save();

      // Send notification to the applicant
      try {
        await createNotification({
          user: user._id,
          type: "operator_application_rejected",
          title: "Operator Application Rejected",
          message: `Your operator application was rejected: ${rejectionReason}`,
        });
      } catch (notifErr) {
        console.error("Failed to send rejection notification:", notifErr);
      }

      await sendOperatorStatusEmail({
        to: user.email,
        name: user.name,
        businessName: user.operatorApplication.businessName,
        status: "rejected",
        rejectionReason,
      });

      return NextResponse.json({
        success: true,
        message: "Operator application rejected",
        data: {
          id: user._id,
          role: user.role,
          operatorApplication: user.operatorApplication,
        },
      });
    }
  } catch (error) {
    console.error("ADMIN OPERATOR APPLICATION PATCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process operator application" },
      { status: 500 }
    );
  }
}
