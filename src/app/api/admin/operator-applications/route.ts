import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const user = await getRequestUser(token);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const search = searchParams.get("search")?.trim() || "";

    // Base query: only users with an actual operator application (non-empty business name)
    const query: Record<string, unknown> = {
      "operatorApplication.businessName": { $exists: true, $ne: "" },
      "operatorApplication.status": { $in: ["pending", "approved", "rejected"] },
    };

    if (
      statusParam &&
      statusParam !== "all" &&
      ["pending", "approved", "rejected"].includes(statusParam)
    ) {
      query["operatorApplication.status"] = statusParam;
    }

    if (search) {
      query.$or = [
        { "operatorApplication.businessName": { $regex: search, $options: "i" } },
        { "operatorApplication.businessType": { $regex: search, $options: "i" } },
        { "operatorApplication.city": { $regex: search, $options: "i" } },
        { "operatorApplication.state": { $regex: search, $options: "i" } },
        { "operatorApplication.country": { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "operatorApplication.phone": { $regex: search, $options: "i" } },
      ];
    }

    const applicationFilter = {
      "operatorApplication.businessName": { $exists: true, $ne: "" },
    };

    const [applications, pendingCount, approvedCount, rejectedCount, totalCount] =
      await Promise.all([
        User.find(query)
          .select("-password")
          .populate("operatorApplication.reviewedBy", "name lastName email")
          .sort({ "operatorApplication.submittedAt": -1, createdAt: -1 })
          .lean(),
        User.countDocuments({
          ...applicationFilter,
          "operatorApplication.status": "pending",
        }),
        User.countDocuments({
          ...applicationFilter,
          "operatorApplication.status": "approved",
        }),
        User.countDocuments({
          ...applicationFilter,
          "operatorApplication.status": "rejected",
        }),
        User.countDocuments({
          ...applicationFilter,
          "operatorApplication.status": { $in: ["pending", "approved", "rejected"] },
        }),
      ]);

    return NextResponse.json({
      success: true,
      count: applications.length,
      counts: {
        all: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
      data: applications,
    });
  } catch (error) {
    console.error("ADMIN OPERATOR APPLICATIONS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch operator applications" },
      { status: 500 }
    );
  }
}
