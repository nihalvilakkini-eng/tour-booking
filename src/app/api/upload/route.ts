import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";
import { uploadTourImage } from "@/lib/tour-images";
import { getMissingCloudinaryCredentials } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

// Ensure payload size stays well within platform limits (e.g. Vercel 4.5MB limit)
// Compressed images are typically 100KB-400KB, max limit 8MB per single-file upload
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

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
          message: "Only operators and admins can upload images",
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Multipart form data required" },
        { status: 415 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("POST /api/upload parse error:", parseError);
      return NextResponse.json(
        { success: false, message: "Could not parse upload payload" },
        { status: 400 }
      );
    }

    const file = formData.get("file") || formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please select an image file to upload" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "Only image files (JPG, PNG, WebP) are allowed" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Image file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: "Image must be under 8MB. Please compress before uploading.",
        },
        { status: 413 }
      );
    }

    try {
      const url = await uploadTourImage(file);
      return NextResponse.json({
        success: true,
        url,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Cloudinary is not configured.")
      ) {
        const missing = getMissingCloudinaryCredentials();
        return NextResponse.json(
          {
            success: false,
            message: `Cloudinary is not configured. Missing: ${missing.join(", ")}`,
          },
          { status: 503 }
        );
      }

      console.error("POST /api/upload Cloudinary upload error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to upload image to Cloudinary",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("POST /api/upload unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during upload" },
      { status: 500 }
    );
  }
}
