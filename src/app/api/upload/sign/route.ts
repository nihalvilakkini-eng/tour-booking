import { NextRequest, NextResponse } from "next/server";
import cloudinary, { configureCloudinary } from "@/lib/cloudinary";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session" },
        { status: 401 }
      );
    }

    if (user.role !== "operator" && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators and admins can upload tour assets",
        },
        { status: 403 }
      );
    }

    try {
      configureCloudinary();
    } catch (configError) {
      const msg =
        configError instanceof Error
          ? configError.message
          : "Cloudinary is not configured";
      return NextResponse.json(
        { success: false, message: msg },
        { status: 503 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary credentials missing from environment",
        },
        { status: 503 }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "tour-booking/tours";

    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      apiSecret
    );

    return NextResponse.json({
      success: true,
      data: {
        signature,
        timestamp,
        apiKey,
        cloudName,
        folder,
      },
    });
  } catch (error) {
    console.error("POST /api/upload/sign error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate upload signature" },
      { status: 500 }
    );
  }
}
