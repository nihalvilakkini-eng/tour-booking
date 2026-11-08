import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Experience from "@/models/Experience";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const experiences = await Experience.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("name description image order")
      .lean();

    return NextResponse.json({
      success: true,
      data: experiences,
    });
  } catch (error) {
    console.error("Experiences GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch experiences" },
      { status: 500 }
    );
  }
}
