import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Experience from "@/models/Experience";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
import { uploadExperienceImage } from "@/lib/tour-images";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
  if (!value) return null;
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

async function getExperienceId(context: RouteContext) {
  const { id } = await context.params;
  return mongoose.isValidObjectId(id) ? id : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    const id = await getExperienceId(context);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invalid place ID" },
        { status: 400 }
      );
    }

    await connectDB();
    const experience = await Experience.findById(id).lean();

    if (!experience) {
      return NextResponse.json(
        { success: false, message: "Place not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: experience,
    });
  } catch (error) {
    console.error("Admin experience GET error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch place" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    const id = await getExperienceId(context);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invalid place ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const experience = await Experience.findById(id);
    if (!experience) {
      return NextResponse.json(
        { success: false, message: "Place not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const name = text(formData, "name") || experience.name;
    const description = text(formData, "description") || experience.description;
    const imageUrl = text(formData, "imageUrl");

    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: "Experience name and description are required" },
        { status: 400 }
      );
    }

    const orderField = formData.get("order");
    let order = experience.order ?? 0;
    if (orderField !== null) {
      const parsedOrder = parseOrder(String(orderField));
      if (parsedOrder === null) {
        return NextResponse.json(
          { success: false, message: "Order must be zero or greater" },
          { status: 400 }
        );
      }
      order = parsedOrder;
    }

    const activeField = formData.get("isActive");
    const isActive =
      activeField === null ? experience.isActive : parseActive(String(activeField));

    const imageFile = formData.get("image");
    let image = experience.image;

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
    } else if (imageUrl) {
      if (!isValidImageReference(imageUrl)) {
        return NextResponse.json(
          {
            success: false,
            message: "Place image must be a valid URL or uploaded image",
          },
          { status: 400 }
        );
      }
      image = imageUrl;
    }

    if (!image) {
      return NextResponse.json(
        { success: false, message: "Place image is required" },
        { status: 400 }
      );
    }

    experience.set({
      name,
      description,
      image,
      order,
      isActive,
    });

    await experience.save();

    return NextResponse.json({
      success: true,
      message: "Place updated successfully",
      data: experience.toObject(),
    });
  } catch (error) {
    console.error("Admin experience PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update place" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    if ("response" in auth) return auth.response;

    const id = await getExperienceId(context);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invalid place ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const experience = await Experience.findByIdAndDelete(id);
    if (!experience) {
      return NextResponse.json(
        { success: false, message: "Place not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Place deleted successfully",
    });
  } catch (error) {
    console.error("Admin experience DELETE error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete place" },
      { status: 500 }
    );
  }
}
