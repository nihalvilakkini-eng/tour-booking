import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getRequestUser(request.cookies.get("token")?.value);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "A valid user ID is required" },
        { status: 400 }
      );
    }

    if (id === admin.userId) {
      return NextResponse.json(
        { success: false, message: "You cannot change your own admin access" },
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
      !("role" in body) ||
      (body.role !== "user" && body.role !== "operator")
    ) {
      return NextResponse.json(
        { success: false, message: "Role must be user or operator" },
        { status: 400 }
      );
    }

    await connectDB();

    const target = await User.findById(id).select("name lastName email role");
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (target.role === "admin") {
      return NextResponse.json(
        { success: false, message: "Admin roles cannot be changed here" },
        { status: 403 }
      );
    }

    if (target.role === body.role) {
      return NextResponse.json(
        { success: false, message: `User already has the ${body.role} role` },
        { status: 409 }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, role: target.role },
      { $set: { role: body.role } },
      { new: true, runValidators: true }
    ).select("name lastName email role");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User role changed; refresh and try again" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User role updated successfully",
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Admin user role PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update user role" },
      { status: 500 }
    );
  }
}
