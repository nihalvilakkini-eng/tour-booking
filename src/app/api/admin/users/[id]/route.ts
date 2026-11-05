import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAdmin(request: NextRequest) {
  const admin = await getRequestUser(request.cookies.get("token")?.value);
  if (!admin) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  if (admin.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      ),
    };
  }
  return { admin };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAdmin(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(id)
      .select("name lastName email phone role isActive profileImage createdAt updatedAt")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...user, isActive: user.isActive !== false },
    });
  } catch (error) {
    console.error("Admin user GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAdmin(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON body is required" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("isActive" in body) ||
      typeof body.isActive !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "isActive must be true or false" },
        { status: 400 }
      );
    }

    const isActive = body.isActive;
    if (
      !isActive &&
      new mongoose.Types.ObjectId(id).equals(auth.admin.userId)
    ) {
      return NextResponse.json(
        { success: false, message: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    await connectDB();
    const target = await User.findById(id).select("name lastName email role isActive");
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if ((target.isActive !== false) === isActive) {
      return NextResponse.json({
        success: true,
        message: `Account is already ${isActive ? "active" : "deactivated"}`,
        data: {
          _id: target._id,
          name: target.name,
          lastName: target.lastName,
          email: target.email,
          role: target.role,
          isActive,
        },
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: id,
        isActive: isActive ? false : { $ne: false },
      },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("name lastName email role isActive");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "Account status changed; refresh and try again" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Account ${isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Admin user status PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update account status" },
      { status: 500 }
    );
  }
}
