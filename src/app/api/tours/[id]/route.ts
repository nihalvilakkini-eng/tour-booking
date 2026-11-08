
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Availability from "@/models/Availability";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
import { getMissingCloudinaryCredentials } from "@/lib/cloudinary";
import { uploadTourImage } from "@/lib/tour-images";
import {
  parseItineraryDays,
  readItineraryImageUploads,
} from "@/lib/tour-itinerary";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getTourManager(
  request: NextRequest
): Promise<
  | { user: RequestUser; error?: never }
  | { user?: never; error: NextResponse }
> {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  try {
    const user = await getRequestUser(token);

    if (!user) {
      return {
        error: NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 }
        ),
      };
    }

    if (user.role !== "operator" && user.role !== "admin") {
      return {
        error: NextResponse.json(
          { success: false, message: "Operator or admin access required" },
          { status: 403 }
        ),
      };
    }

    if (!mongoose.isValidObjectId(user.userId)) {
      return {
        error: NextResponse.json(
          { success: false, message: "Invalid operator account" },
          { status: 401 }
        ),
      };
    }

    return { user };
  } catch (error) {
    console.error("Tour authentication error:", error);
    return {
      error: NextResponse.json(
        { success: false, message: "Unable to verify account" },
        { status: 500 }
      ),
    };
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid tour ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const tour = await Tour.findById(id).lean();

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Tour not found" },
        { status: 404 }
      );
    }

    let user: RequestUser | null = null;
    const token = request.cookies.get("token")?.value;

    if (token) {
      try {
        user = await getRequestUser(token);
      } catch {
        user = null;
      }
    }

    const canViewInactive =
      user?.role === "admin" ||
      (user?.role === "operator" &&
        String(tour.operator) === user.userId);

    if (tour.isActive === false && !canViewInactive) {
      return NextResponse.json(
        { success: false, message: "Tour not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: tour },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/tours/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load tour" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const auth = await getTourManager(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid tour ID" },
      { status: 400 }
    );
  }

  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return NextResponse.json(
      { success: false, message: "Submit tour details as multipart form data" },
      { status: 415 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Ownership check: operators update only their own tours; admins can update any tour.
    const tour =
      auth.user.role === "admin"
        ? await Tour.findById(id)
        : await Tour.findOne({
            _id: id,
            operator: auth.user.userId,
          });

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Tour not found or access denied" },
        { status: 404 }
      );
    }

    const getText = (field: string) => {
      const value = formData.get(field);
      return typeof value === "string" ? value.trim() : "";
    };

    const getTextList = (field: string): string[] | null => {
      const values = formData.getAll(field);

      if (!values.every((value): value is string => typeof value === "string")) {
        return null;
      }

      return values.map((value) => value.trim()).filter(Boolean);
    };

    const title = getText("title");
    const description = getText("description");
    const destination = getText("destination");
    const activityType = getText("activityType");
    const duration = Number(getText("duration"));
    const durationUnit = getText("durationUnit");
    const priceValue = getText("price");
    const price = Number(priceValue);
    const currency = getText("currency") || "INR";
    const maxParticipants = Number(getText("maxParticipants"));
    const meetingPoint = getText("meetingPoint");
    const hasTourDetails = Boolean(
      title ||
        description ||
        destination ||
        activityType ||
        getText("duration") ||
        getText("durationUnit") ||
        priceValue ||
        getText("currency") ||
        getText("maxParticipants") ||
        meetingPoint
    );
    const itineraryOnlyUpdate = !hasTourDetails;

    if (itineraryOnlyUpdate && formData.get("itineraryDays") === null) {
      return NextResponse.json(
        { success: false, message: "Itinerary details are required" },
        { status: 400 }
      );
    }

    if (!itineraryOnlyUpdate) {
      if (!title || !description || !destination || !activityType || !meetingPoint) {
        return NextResponse.json(
          { success: false, message: "Please complete all required tour fields" },
          { status: 400 }
        );
      }

      if (!Number.isFinite(duration) || duration < 1) {
        return NextResponse.json(
          { success: false, message: "Duration must be at least 1" },
          { status: 400 }
        );
      }

      if (durationUnit !== "hours" && durationUnit !== "days") {
        return NextResponse.json(
          { success: false, message: "Duration unit must be hours or days" },
          { status: 400 }
        );
      }

      if (!priceValue || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { success: false, message: "Price must be greater than zero" },
          { status: 400 }
        );
      }

      if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
        return NextResponse.json(
          { success: false, message: "Maximum participants must be at least 1" },
          { status: 400 }
        );
      }

      if (maxParticipants !== tour.maxParticipants) {
        const conflictingAvailability = await Availability.findOne({
          tour: tour._id,
          totalSeats: { $gt: maxParticipants },
        })
          .select("_id")
          .lean();

        if (conflictingAvailability) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Maximum participants cannot be lower than an existing availability slot's total seats",
            },
            { status: 400 }
          );
        }
      }
    }

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
        { success: false, message: "List fields must contain text values" },
        { status: 400 }
      );
    }

    const parsedItinerary = parseItineraryDays(
      formData.get("itineraryDays")
    );

    if ("error" in parsedItinerary) {
      return NextResponse.json(
        { success: false, message: parsedItinerary.error },
        { status: 400 }
      );
    }

    const itineraryDays = parsedItinerary.itineraryDays.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({ ...activity })),
    }));

    // Existing activity image URLs may be retained, but new uploads must use files.
    const oldActivityImages = new Set(
      (tour.itineraryDays ?? [])
        .flatMap((day) => day.activities ?? [])
        .map((activity) => activity.image || "")
        .filter(Boolean)
    );

    for (const day of itineraryDays) {
      for (const activity of day.activities) {
        if (activity.image && !oldActivityImages.has(activity.image)) {
          return NextResponse.json(
            {
              success: false,
              message: "An itinerary image is invalid. Please upload it again.",
            },
            { status: 400 }
          );
        }
      }
    }

    const activityUploads = readItineraryImageUploads(
      formData,
      itineraryDays
    );

    if ("error" in activityUploads) {
      return NextResponse.json(
        { success: false, message: activityUploads.error },
        { status: 400 }
      );
    }

    // Keep only existing tour photos explicitly sent by the full edit form.
    const requestedExistingImages = itineraryOnlyUpdate
      ? []
      : getTextList("existingImages");

    if (!itineraryOnlyUpdate && requestedExistingImages === null) {
      return NextResponse.json(
        { success: false, message: "Invalid existing image values" },
        { status: 400 }
      );
    }

    const oldImages = new Set(tour.images ?? []);
    const safeExistingImages = requestedExistingImages ?? [];

    if (
      !itineraryOnlyUpdate &&
      safeExistingImages.some((url) => !oldImages.has(url))
    ) {
      return NextResponse.json(
        { success: false, message: "An existing tour image is invalid" },
        { status: 400 }
      );
    }

    const imageEntries = itineraryOnlyUpdate
      ? []
      : formData.getAll("images");

    if (imageEntries.some((item) => typeof item === "string")) {
      return NextResponse.json(
        { success: false, message: "Tour photos must be image files" },
        { status: 400 }
      );
    }

    const imageFiles = imageEntries.filter(
      (item): item is File => item instanceof File
    );

    if (!itineraryOnlyUpdate) {
      const totalImages = safeExistingImages.length + imageFiles.length;

      if (totalImages > 10) {
        return NextResponse.json(
          { success: false, message: "Maximum 10 tour photos are allowed" },
          { status: 400 }
        );
      }

      if (process.env.NODE_ENV === "production" && totalImages === 0) {
        return NextResponse.json(
          { success: false, message: "At least one tour photo is required" },
          { status: 400 }
        );
      }

      for (const file of imageFiles) {
        if (
          file.size === 0 ||
          !file.type.startsWith("image/") ||
          file.size > 10 * 1024 * 1024
        ) {
          return NextResponse.json(
            { success: false, message: "Each tour photo must be an image under 10MB" },
            { status: 400 }
          );
        }
      }
    }

    const newImageUrls: string[] = [];

    if (!itineraryOnlyUpdate) {
      for (const file of imageFiles) {
        try {
          newImageUrls.push(await uploadTourImage(file));
        } catch (error) {
          console.error("Tour photo upload error:", error);

          const unavailable =
            error instanceof Error &&
            error.message.startsWith("Cloudinary is not configured.");

          return NextResponse.json(
            {
              success: false,
              message: unavailable
                ? `Cloudinary is not configured. Missing: ${getMissingCloudinaryCredentials().join(", ")}`
                : "Unable to upload a tour photo to Cloudinary",
            },
            { status: unavailable ? 503 : 502 }
          );
        }
      }
    }

    for (const upload of activityUploads.uploads) {
      try {
        itineraryDays[upload.dayIndex].activities[upload.activityIndex].image =
          await uploadTourImage(upload.file);
      } catch (error) {
        console.error("Itinerary image upload error:", error);

        const unavailable =
          error instanceof Error &&
          error.message.startsWith("Cloudinary is not configured.");

        return NextResponse.json(
          {
            success: false,
            message: unavailable
              ? `Cloudinary is not configured. Missing: ${getMissingCloudinaryCredentials().join(", ")}`
              : "Unable to upload an itinerary activity image",
          },
          { status: unavailable ? 503 : 502 }
        );
      }
    }

    // Update editable tour fields. Related records and ratings are untouched.
    if (itineraryOnlyUpdate) {
      tour.set({ itineraryDays });
    } else {
      tour.set({
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
        itineraryDays,
        highlights,
        meetingPoint,
        inclusions,
        exclusions,
        images: [...safeExistingImages, ...newImageUrls],
      });
    }

    await tour.save();

    return NextResponse.json(
      {
        success: true,
        message: "Tour updated successfully",
        data: tour,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH /api/tours/[id] error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const details = Object.values(error.errors)
        .map((item) => item.message)
        .join("; ");

      return NextResponse.json(
        { success: false, message: `Tour validation failed: ${details}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update tour" },
      { status: 500 }
    );
  }
}

// DELETE - Admin-only tour deactivation. Preserves the tour, bookings,
// availability records and images for audit/history.
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await getTourManager(request);
    if (auth.error) return auth.error;

    if (auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid tour ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const tour = await Tour.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Tour not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tour deactivated successfully",
      data: tour,
    });
  } catch (error) {
    console.error("DELETE /api/tours/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to deactivate tour" },
      { status: 500 }
    );
  }
}
