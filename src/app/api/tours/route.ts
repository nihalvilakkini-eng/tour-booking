import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import cloudinary from "@/lib/cloudinary";
export const dynamic = "force-dynamic";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserFromToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  if (
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}

async function uploadImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadResult = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "tour-booking/tours",
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error("Cloudinary upload failed"));
            return;
          }

          resolve({
            secure_url: result.secure_url,
          });
        }
      );

      uploadStream.end(buffer);
    }
  );

  return uploadResult.secure_url;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get JWT token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Verify JWT
    const { userId, role } = getUserFromToken(token);

    // Only operator can create tours
    if (role !== "operator") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators can create tours",
        },
        { status: 403 }
      );
    }

    // Read form data
    const formData = await request.formData();

    const title = formData.get("title")?.toString().trim();
    const description = formData.get("description")?.toString().trim();
    const destination = formData.get("destination")?.toString().trim();
    const activityType = formData.get("activityType")?.toString().trim();

    const duration = Number(formData.get("duration"));
    const durationUnit = formData.get("durationUnit")?.toString();

    const price = Number(formData.get("price"));
    const currency =
      formData.get("currency")?.toString().trim() || "INR";

    const maxParticipants = Number(
      formData.get("maxParticipants")
    );

    const meetingPoint = formData
      .get("meetingPoint")
      ?.toString()
      .trim();

    // Convert comma-separated values into arrays
    const itinerary = formData
      .getAll("itinerary")
      .map((item) => item.toString().trim())
      .filter(Boolean);

    const highlights = formData
      .getAll("highlights")
      .map((item) => item.toString().trim())
      .filter(Boolean);

    const inclusions = formData
      .getAll("inclusions")
      .map((item) => item.toString().trim())
      .filter(Boolean);

    const exclusions = formData
      .getAll("exclusions")
      .map((item) => item.toString().trim())
      .filter(Boolean);

    // Validation
    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour title is required",
        },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour description is required",
        },
        { status: 400 }
      );
    }

    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination is required",
        },
        { status: 400 }
      );
    }

    if (!activityType) {
      return NextResponse.json(
        {
          success: false,
          message: "Activity type is required",
        },
        { status: 400 }
      );
    }

    if (!duration || duration < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Duration must be at least 1",
        },
        { status: 400 }
      );
    }

    if (durationUnit !== "hours" && durationUnit !== "days") {
      return NextResponse.json(
        {
          success: false,
          message: "Duration unit must be hours or days",
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid price is required",
        },
        { status: 400 }
      );
    }

    if (!maxParticipants || maxParticipants < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum participants must be at least 1",
        },
        { status: 400 }
      );
    }

    if (!meetingPoint) {
      return NextResponse.json(
        {
          success: false,
          message: "Meeting point is required",
        },
        { status: 400 }
      );
    }

    // Get uploaded images
    const imageFiles = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File);

    // At least one image required
    if (imageFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one tour image is required",
        },
        { status: 400 }
      );
    }

    // Maximum 10 images
    if (imageFiles.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum 10 tour images are allowed",
        },
        { status: 400 }
      );
    }

    // Validate images
    for (const file of imageFiles) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            success: false,
            message: "Only image files are allowed",
          },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            message: "Each image must be less than 10MB",
          },
          { status: 400 }
        );
      }
    }

    // Upload images to Cloudinary
    const imageUrls: string[] = [];

    for (const file of imageFiles) {
      const imageUrl = await uploadImage(file);
      imageUrls.push(imageUrl);
    }

    // Create tour
    const tour = await Tour.create({
      title,
      description,
      destination,
      activityType,
      duration,
      durationUnit,
      price,
      currency,
      maxParticipants,
      itinerary,
      highlights,
      meetingPoint,
      inclusions,
      exclusions,
      images: imageUrls,
      operator: userId,
      rating: 0,
      reviewCount: 0,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tour created successfully",
        data: tour,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tour error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create tour",
      },
      { status: 500 }
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const destination = searchParams.get("destination");
    const activityType = searchParams.get("activityType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const duration = searchParams.get("duration");
    const durationUnit = searchParams.get("durationUnit");
    const mine = searchParams.get("mine");

    const filter: Record<string, unknown> = {
      isActive: true,
    };

    // Return only the logged-in operator's tours when mine=true.
    if (mine === "true") {
      const token = request.cookies.get("token")?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, message: "Please login" },
          { status: 401 }
        );
      }

      let user: { userId: string; role: string };

      try {
        user = getUserFromToken(token);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 }
        );
      }

      if (user.role !== "operator") {
        return NextResponse.json(
          { success: false, message: "Operator access required" },
          { status: 403 }
        );
      }

      filter.operator = user.userId;
    }

    if (destination) {
      filter.destination = { $regex: destination, $options: "i" };
    }

    if (activityType) {
      filter.activityType = { $regex: activityType, $options: "i" };
    }

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};

      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      filter.price = priceFilter;
    }

    if (duration) filter.duration = Number(duration);
    if (durationUnit) filter.durationUnit = durationUnit;

    const tours = await Tour.find(filter)
      .populate("operator", "name lastName email")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, count: tours.length, data: tours },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get tours error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}