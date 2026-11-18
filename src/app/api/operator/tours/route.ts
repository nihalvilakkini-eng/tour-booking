import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import cloudinary from "@/lib/cloudinary";
import { getRequestUser } from "@/lib/request-user";
import {
  parseItineraryDays,
  readItineraryImageUploads,
} from "@/lib/tour-itinerary";
import { uploadTourImage } from "@/lib/tour-images";
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

    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let jsonBody: Record<string, unknown> | null = null;
    let formData: FormData | null = null;

    if (isJson) {
      try {
        jsonBody = (await request.json()) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid JSON request body" },
          { status: 400 }
        );
      }
    } else {
      formData = await request.formData();
    }

    const getString = (field: string) => {
      if (jsonBody) {
        const val = jsonBody[field];
        return typeof val === "string" ? val.trim() : "";
      }
      const val = formData?.get(field);
      return typeof val === "string" ? val.trim() : "";
    };

    const getNumber = (field: string) => {
      if (jsonBody) return Number(jsonBody[field]);
      return Number(formData?.get(field));
    };

    const getList = (field: string) => {
      if (jsonBody) {
        const val = jsonBody[field];
        if (Array.isArray(val)) {
          return val.map((s) => String(s).trim()).filter(Boolean);
        }
        if (typeof val === "string") {
          return val.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
        }
        return [];
      }
      return (formData?.getAll(field) ?? [])
        .map((value) => value.toString().trim())
        .filter(Boolean);
    };

    const title = getString("title");
    const description = getString("description");
    const destination = getString("destination");
    const country = getString("country");
    const state = getString("state");
    const rawCategory = getString("category");
    const rawActivityType = getString("activityType");

    const activityType = (rawActivityType || rawCategory || "").trim();
    const category = (rawCategory || rawActivityType || "").trim();

    const duration = getNumber("duration");
    const durationUnit = getString("durationUnit") === "days" ? "days" : "hours";
    const price = getNumber("price");
    const currency = getString("currency") || "INR";
    const maxParticipants = getNumber("maxParticipants");
    const meetingPoint = getString("meetingPoint");

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
            "Title, description, destination, activity type/category, and meeting point are required",
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

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Price must be greater than zero",
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

    const itinerary = getList("itinerary");
    const highlights = getList("highlights");
    const inclusions = getList("inclusions");
    const exclusions = getList("exclusions");

    const itineraryDaysRaw = jsonBody
      ? jsonBody.itineraryDays
      : formData?.get("itineraryDays");

    const parsedItinerary = parseItineraryDays(itineraryDaysRaw);
    if ("error" in parsedItinerary) {
      return NextResponse.json(
        { success: false, message: parsedItinerary.error },
        { status: 400 }
      );
    }

    const itineraryDays = parsedItinerary.itineraryDays.map((day) => ({
      ...day,
      activities: [...day.activities],
    }));

    if (formData) {
      const itineraryImageUploads = readItineraryImageUploads(
        formData,
        parsedItinerary.itineraryDays
      );
      if ("error" in itineraryImageUploads) {
        return NextResponse.json(
          { success: false, message: itineraryImageUploads.error },
          { status: 400 }
        );
      }
      for (const upload of itineraryImageUploads.uploads) {
        itineraryDays[upload.dayIndex].activities[upload.activityIndex].image =
          await uploadTourImage(upload.file);
      }
    }

    const imageUrls: string[] = [];
    const imageFiles: File[] = [];

    const rawImages = jsonBody
      ? Array.isArray(jsonBody.images)
        ? jsonBody.images
        : typeof jsonBody.images === "string"
        ? [jsonBody.images]
        : []
      : formData
      ? formData.getAll("images")
      : [];

    for (const item of rawImages) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data:") || trimmed.includes(";base64,")) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Base64 image data is not allowed. Upload images directly to Cloudinary and provide secure URLs.",
            },
            { status: 400 }
          );
        }

        if (/^https?:\/\//i.test(trimmed)) {
          imageUrls.push(trimmed);
        }
      } else if (item instanceof File && item.size > 0) {
        imageFiles.push(item);
      }
    }

    if (imageUrls.length + imageFiles.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum 10 images are allowed",
        },
        { status: 400 }
      );
    }

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
      country,
      state,
      category,
      activityType,
      duration,
      durationUnit,
      price,
      currency,
      maxParticipants,
      itinerary,
      itineraryDays,
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