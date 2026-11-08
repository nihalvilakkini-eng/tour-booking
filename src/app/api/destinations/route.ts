import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Destination from "@/models/Destination";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const destinations = await Destination.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .select("name country state city description image search order")
      .lean();

    return NextResponse.json({
      success: true,
      data: destinations,
    });
  } catch (error) {
    console.error("Destinations GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch destinations",
      },
      { status: 500 }
    );
  }
}
