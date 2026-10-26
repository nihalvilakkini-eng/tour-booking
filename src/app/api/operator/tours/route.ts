import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import cloudinary from "@/lib/cloudinary";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

type OperatorAuthResult =
  | { operatorId: string }
  | { response: NextResponse };

async function getOperatorId(request: NextRequest): Promise<OperatorAuthResult> {
  const token = request.cookies.get("token")?.value;

  const user = await getRequestUser(token);
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, message: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "operator") {
    return {
      response: NextResponse.json(
        { success: false, message: "This account does not have the operator role." },
        { status: 403 }
      ),
    };
  }

  return { operatorId: user.userId };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getOperatorId(request);
    if ("response" in auth) return auth.response;

    await connectDB();

    const tours = await Tour.find({
      operator: auth.operatorId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: tours,
    });
  } catch (error) {
    console.error("Operator tours GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch operator tours",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getOperatorId(request);
    if ("response" in auth) return auth.response;

    await connectDB();

    const formData = await request.formData();

    const title = formData.get("title")?.toString().trim();
    const description = formData.get("description")?.toString().trim();
    const destination = formData.get("destination")?.toString().trim();
    const activityType = formData.get("activityType")?.toString().trim();

    const duration = Number(formData.get("duration"));
    const durationUnit =
      formData.get("durationUnit")?.toString() || "hours";

    const price = Number(formData.get("price"));

    const currency =
      formData.get("currency")?.toString().trim() || "INR";

    const maxParticipants = Number(formData.get("maxParticipants"));

    const meetingPoint = formData.get("meetingPoint")?.toString().trim();

    if (
      !title ||
      !description ||
      !destination ||
      !activityType ||
      !meetingPoint
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Title, description, destination, activity type and meeting point are required",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(duration) || duration < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Duration must be at least 1",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Price cannot be negative",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum participants must be at least 1",
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

    const getArray = (field: string) => {
      return formData
        .getAll(field)
        .map((value) => value.toString().trim())
        .filter(Boolean);
    };

    const itinerary = getArray("itinerary");
    const highlights = getArray("highlights");
    const inclusions = getArray("inclusions");
    const exclusions = getArray("exclusions");

    const imageFiles = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    if (imageFiles.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum 10 images are allowed",
        },
        { status: 400 }
      );
    }

    const imageUrls: string[] = [];

    for (const file of imageFiles) {
      if (file.size === 0) {
        continue;
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            success: false,
            message: "Only image files are allowed",
          },
          { status: 400 }
        );
      }

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
              if (error || !result) {
                reject(error || new Error("Cloudinary upload failed"));
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

      imageUrls.push(uploadResult.secure_url);
    }

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
      operator: auth.operatorId,
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
    console.error("Operator tours POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create tour",
      },
      { status: 500 }
    );
  }
}