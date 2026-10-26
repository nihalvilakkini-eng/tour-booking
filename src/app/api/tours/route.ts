import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import cloudinary, {
  configureCloudinary,
  getMissingCloudinaryCredentials,
} from "@/lib/cloudinary";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

async function uploadImage(file: File): Promise<string> {
  configureCloudinary();

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

  let user: RequestUser | null;
  try {
    user = await getRequestUser(token);
  } catch (error) {
    console.error("POST /api/tours authentication error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify account permissions" },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired authentication token",
      },
      { status: 401 }
    );
  }
  const { userId, role } = user;

  if (role !== "operator" && role !== "admin") {
    return NextResponse.json(
      {
        success: false,
        message: "Only operators and admins can create tours",
      },
      { status: 403 }
    );
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json(
      {
        success: false,
        message: "The operator account in this session is invalid",
      },
      { status: 401 }
    );
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        success: false,
        message: "Tour details and images must be submitted as multipart form data",
      },
      { status: 415 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("POST /api/tours could not parse the request body:", error);
    return NextResponse.json(
      {
        success: false,
        message: "The tour request body is malformed",
      },
      { status: 400 }
    );
  }

  try {
    const getText = (field: string) => {
      const value = formData.get(field);
      return typeof value === "string" ? value.trim() : "";
    };

    const title = getText("title");
    const description = getText("description");
    const destination = getText("destination");
    const activityType = getText("activityType");
    const durationValue = getText("duration");
    const durationUnit = getText("durationUnit");
    const priceValue = getText("price");
    const priceCurrency = getText("currency");
    const maxParticipantsValue = getText("maxParticipants");
    const meetingPoint = getText("meetingPoint");

    const duration = Number(durationValue);
    const price = Number(priceValue);
    const maxParticipants = Number(maxParticipantsValue);
    const currency = priceCurrency || "INR";

    // Convert comma-separated values into arrays
    const getTextList = (field: string): string[] | null => {
      const items = formData.getAll(field);

      if (!items.every((item): item is string => typeof item === "string")) {
        return null;
      }

      return items.map((item) => item.trim()).filter(Boolean);
    };

    const itinerary = getTextList("itinerary");
    const highlights = getTextList("highlights");
    const inclusions = getTextList("inclusions");
    const exclusions = getTextList("exclusions");

    if (
      itinerary === null ||
      highlights === null ||
      inclusions === null ||
      exclusions === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Itinerary, highlights, inclusions and exclusions must be text values",
        },
        { status: 400 }
      );
    }

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

    if (!Number.isFinite(duration) || duration < 1) {
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

    if (!priceValue || !Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid price is required",
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
    const imageEntries = formData.getAll("images");
    if (imageEntries.some((item) => typeof item === "string")) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour images must be uploaded as image files",
        },
        { status: 400 }
      );
    }

    const imageFiles = imageEntries.filter(
      (item): item is File => item instanceof File
    );

    // Production keeps the existing image requirement; development can create
    // tours without configuring an external image service.
    if (process.env.NODE_ENV === "production" && imageFiles.length === 0) {
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
      if (file.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Tour image files cannot be empty",
          },
          { status: 400 }
        );
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

    try {
      await connectDB();
    } catch (error) {
      console.error("POST /api/tours MongoDB connection error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Could not connect to MongoDB. Check the database URI and network access.",
        },
        { status: 503 }
      );
    }

    // Upload images to Cloudinary
    const imageUrls: string[] = [];

    for (const file of imageFiles) {
      try {
        const imageUrl = await uploadImage(file);
        imageUrls.push(imageUrl);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Cloudinary is not configured.")) {
          console.error("POST /api/tours Cloudinary configuration error:", error.message);
          const missingCredentials = getMissingCloudinaryCredentials();

          return NextResponse.json(
            {
              success: false,
              message: `Image upload is unavailable because Cloudinary is not configured. Add valid ${missingCredentials.join(", ")} values to .env.local and restart the server, or remove the images and submit the tour without them during development.`,
            },
            { status: 503 }
          );
        }

        const uploadError =
          error !== null && typeof error === "object"
            ? (error as {
                message?: unknown;
                name?: unknown;
                http_code?: unknown;
                request_id?: unknown;
              })
            : {};

        const providerMessage =
          typeof uploadError.message === "string"
            ? uploadError.message
            : "Unknown Cloudinary error";
        const safeProviderMessage = providerMessage.slice(0, 250);

        console.error("POST /api/tours Cloudinary upload error:", {
          name: uploadError.name,
          httpCode: uploadError.http_code,
          requestId: uploadError.request_id,
          message: safeProviderMessage,
        });

        const invalidCredentials =
          uploadError.http_code === 401 ||
          /invalid api[_ ]?key|api[_ ]?secret|invalid signature|must supply cloud_name|must supply api_key/i.test(
            providerMessage
          );

        return NextResponse.json(
          {
            success: false,
            message: invalidCredentials
              ? "Cloudinary rejected the configured credentials. Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local, then restart the server."
              : `Cloudinary image upload failed: ${safeProviderMessage}`,
          },
          { status: invalidCredentials ? 503 : 502 }
        );
      }
    }

    // Create tour
    let tour;

    try {
      tour = await Tour.create({
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
    } catch (error) {
      console.error("POST /api/tours MongoDB save error:", error);

      if (error instanceof mongoose.Error.ValidationError) {
        const details = Object.values(error.errors)
          .map((validationError) => validationError.message)
          .join("; ");

        return NextResponse.json(
          {
            success: false,
            message: `Tour validation failed: ${details}`,
          },
          { status: 400 }
        );
      }

      if (error instanceof mongoose.Error.CastError) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid value for tour field "${error.path}"`,
          },
          { status: 400 }
        );
      }

      if (
        error !== null &&
        typeof error === "object" &&
        "name" in error &&
        "code" in error &&
        error.name === "MongoServerError" &&
        error.code === 11000
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "The tour conflicts with an existing database record",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "MongoDB could not save the tour. Check the database logs and try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Tour created successfully",
        data: tour,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/tours unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected server error occurred while creating the tour",
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

      const user = await getRequestUser(token);

      if (!user) {
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