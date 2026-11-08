import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Experience from "@/models/Experience";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
import { uploadExperienceImage } from "@/lib/tour-images";

export const dynamic = "force-dynamic";

type AdminAuthResult =
  | { user: RequestUser }
  | { response: NextResponse };

async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const user = await getRequestUser(request.cookies.get("token")?.value);

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      response: NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { user };
}

function text(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function parseOrder(value: string) {
  if (!value) return 0;
  const order = Number(value);
  return Number.isFinite(order) && order >= 0 ? order : null;
}

function parseActive(value: string | null) {
  return value !== "false" && value !== "0" && value !== "off";
}

function isValidImageReference(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

async function uploadPlaceImage(file: File) {
  try {
    return { url: await uploadExperienceImage(file) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload place image";
    const unavailable = message.startsWith("Cloudinary is not configured.");

    return {
      error: NextResponse.json(
        { success: false, message },
        { status: unavailable ? 503 : 502 }
      ),
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    await connectDB();

    const experiences = await Experience.find({})
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: experiences,
    });
  } catch (error) {
    console.error("Admin experiences GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch experiences" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    await connectDB();

    const formData = await request.formData();
    const name = text(formData, "name");
    const description = text(formData, "description");
    const imageUrl = text(formData, "imageUrl");
    const orderValue = parseOrder(text(formData, "order"));
    const isActive = parseActive(formData.get("isActive") as string | null);

    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: "Experience name and description are required" },
        { status: 400 }
      );
    }

    if (orderValue === null) {
      return NextResponse.json(
        { success: false, message: "Order must be zero or greater" },
        { status: 400 }
      );
    }

    const imageFile = formData.get("image");
    let image = "";

    if (imageFile instanceof File && imageFile.size > 0) {
      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, message: "Place image must be an image file" },
          { status: 400 }
        );
      }
      if (imageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: "Place image must be under 10MB" },
          { status: 400 }
        );
      }

      const uploaded = await uploadPlaceImage(imageFile);
      if ("error" in uploaded) return uploaded.error;
      image = uploaded.url;
    } else {
      if (!imageUrl || !isValidImageReference(imageUrl)) {
        return NextResponse.json(
          {
            success: false,
            message: "A valid place image URL or image file is required",
          },
          { status: 400 }
        );
      }
      image = imageUrl;
    }

    const experience = await Experience.create({
      name,
      description,
      image,
      order: orderValue,
      isActive,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Place created successfully",
        data: experience,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin experiences POST error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create place" },
      { status: 500 }
    );
  }
}
