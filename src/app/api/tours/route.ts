import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Destination from "@/models/Destination";
import Availability from "@/models/Availability";
import { getMissingCloudinaryCredentials } from "@/lib/cloudinary";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
import {
  parseItineraryDays,
  readItineraryImageUploads,
} from "@/lib/tour-itinerary";
import { uploadTourImage } from "@/lib/tour-images";
export const dynamic = "force-dynamic";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
let assignedOperatorId = userId;
const createdById = userId;

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

  const contentType = request.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const isMultipart = contentType.includes("multipart/form-data");

  if (!isJson && !isMultipart) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Tour details must be submitted as JSON or multipart form data",
      },
      { status: 415 }
    );
  }

  let jsonBody: Record<string, unknown> | null = null;
  let formData: FormData | null = null;

  if (isJson) {
    try {
      jsonBody = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }
  } else {
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
  }

  try {
    const getString = (field: string): string => {
      if (jsonBody) {
        const value = jsonBody[field];
        return typeof value === "string" ? value.trim() : "";
      }
      const value = formData?.get(field);
      return typeof value === "string" ? value.trim() : "";
    };

    const getNumber = (field: string): number => {
      if (jsonBody) {
        const value = jsonBody[field];
        return Number(value);
      }
      return Number(formData?.get(field));
    };

    const getList = (field: string): string[] => {
      if (jsonBody) {
        const val = jsonBody[field];
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter(Boolean);
        }
        if (typeof val === "string") {
          return val
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);
        }
        return [];
      }
      const items = formData?.getAll(field) ?? [];
      const result: string[] = [];
      for (const item of items) {
        if (typeof item === "string") {
          item
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((s) => result.push(s));
        }
      }
      return result;
    };

    const selectedOperatorId = getString("operatorId");

    if (role === "admin") {
      if (!selectedOperatorId) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select an operator",
          },
          { status: 400 }
        );
      }

      if (!mongoose.isValidObjectId(selectedOperatorId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid operator selection",
          },
          { status: 400 }
        );
      }

      await connectDB();
      const selectedOperator = await User.findOne({
        _id: selectedOperatorId,
        role: "operator",
        isActive: { $ne: false },
      }).select("_id");

      if (!selectedOperator) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected operator does not exist",
          },
          { status: 404 }
        );
      }

      assignedOperatorId = selectedOperator._id.toString();
    }

    const title = getString("title");
    const description = getString("description");
    const destination = getString("destination");
    let country = getString("country");
    let state = getString("state");
    let category = getString("category");
    let activityType = getString("activityType");

    // Harmonize category and activityType
    activityType = (activityType || category || "").trim();
    category = (category || activityType || "").trim();

    const duration = getNumber("duration");
    const durationUnit = getString("durationUnit") === "days" ? "days" : "hours";
    const price = getNumber("price");
    const currency = getString("currency") || "INR";
    let maxParticipants = getNumber("maxParticipants");
    const meetingPoint = getString("meetingPoint");

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
        {
          success: false,
          message: parsedItinerary.error,
        },
        { status: 400 }
      );
    }

    // Verify no Base64 in activity images
    for (const day of parsedItinerary.itineraryDays) {
      for (const act of day.activities) {
        if (
          act.image &&
          (act.image.startsWith("data:") || act.image.includes(";base64,"))
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Base64 itinerary image is not allowed. Upload images to Cloudinary and provide secure URLs.",
            },
            { status: 400 }
          );
        }
      }
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
          message: "Activity type / category is required",
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

    if (!meetingPoint) {
      return NextResponse.json(
        {
          success: false,
          message: "Meeting point is required",
        },
        { status: 400 }
      );
    }

    // Availability validation
    const availabilityRaw = jsonBody
      ? jsonBody.availability
      : formData?.get("availability");

    const availabilitySlots: Array<{
      date: Date;
      endDate: Date;
      startTime: string;
      endTime: string;
      totalSeats: number;
      availableSeats: number;
      isAvailable: boolean;
    }> = [];

    if (availabilityRaw) {
      let parsedAvailability: unknown = availabilityRaw;
      if (typeof availabilityRaw === "string") {
        try {
          parsedAvailability = JSON.parse(availabilityRaw);
        } catch {
          return NextResponse.json(
            { success: false, message: "Availability details must be valid JSON" },
            { status: 400 }
          );
        }
      }

      if (!Array.isArray(parsedAvailability)) {
        return NextResponse.json(
          { success: false, message: "Availability must be a list of slots" },
          { status: 400 }
        );
      }

      const validTime = (value: unknown) =>
        typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const seenSlots = new Set<string>();

      for (const [index, rawSlot] of parsedAvailability.entries()) {
        const label = `Availability slot ${index + 1}`;
        if (!rawSlot || typeof rawSlot !== "object" || Array.isArray(rawSlot)) {
          return NextResponse.json(
            { success: false, message: `${label} is invalid` },
            { status: 400 }
          );
        }

        const slot = rawSlot as Record<string, unknown>;
        const slotDateValue = typeof slot.date === "string" ? slot.date : "";
        const slotEndDateValue =
          typeof slot.endDate === "string" && slot.endDate
            ? slot.endDate
            : slotDateValue;
        const slotStartTime = slot.startTime;
        const slotEndTime = typeof slot.endTime === "string" ? slot.endTime : "";
        const slotTotalSeats = Number(slot.totalSeats);
        const slotAvailableSeats =
          slot.availableSeats === undefined || slot.availableSeats === ""
            ? slotTotalSeats
            : Number(slot.availableSeats);
        const slotIsAvailable = slot.isAvailable !== false;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDateValue)) {
          return NextResponse.json(
            { success: false, message: `${label} requires a valid date` },
            { status: 400 }
          );
        }

        const slotDate = new Date(`${slotDateValue}T00:00:00.000Z`);
        const slotEndDate = new Date(`${slotEndDateValue}T00:00:00.000Z`);

        if (
          Number.isNaN(slotDate.getTime()) ||
          slotDate.toISOString().slice(0, 10) !== slotDateValue ||
          Number.isNaN(slotEndDate.getTime()) ||
          slotEndDate.toISOString().slice(0, 10) !== slotEndDateValue
        ) {
          return NextResponse.json(
            { success: false, message: `${label} has an invalid date` },
            { status: 400 }
          );
        }

        if (slotDate < today) {
          return NextResponse.json(
            { success: false, message: `${label} cannot be in the past` },
            { status: 400 }
          );
        }

        if (slotEndDate < slotDate) {
          return NextResponse.json(
            { success: false, message: `${label} ending date cannot be before its date` },
            { status: 400 }
          );
        }

        if (!validTime(slotStartTime)) {
          return NextResponse.json(
            { success: false, message: `${label} requires a valid start time` },
            { status: 400 }
          );
        }

        if (slotEndTime && (!validTime(slotEndTime) || slotEndTime <= (slotStartTime as string))) {
          return NextResponse.json(
            { success: false, message: `${label} end time must be after start time` },
            { status: 400 }
          );
        }

        if (!Number.isInteger(slotTotalSeats) || slotTotalSeats < 1) {
          return NextResponse.json(
            { success: false, message: `${label} total seats must be at least 1` },
            { status: 400 }
          );
        }

        if (slotTotalSeats > maxParticipants) {
          maxParticipants = slotTotalSeats;
        }

        if (
          !Number.isInteger(slotAvailableSeats) ||
          slotAvailableSeats < 0 ||
          slotAvailableSeats > slotTotalSeats
        ) {
          return NextResponse.json(
            { success: false, message: `${label} available seats are invalid` },
            { status: 400 }
          );
        }

        const slotKey = `${slotDateValue}|${slotStartTime}`;
        if (seenSlots.has(slotKey)) {
          return NextResponse.json(
            { success: false, message: `${label} duplicates another slot` },
            { status: 400 }
          );
        }
        seenSlots.add(slotKey);

        availabilitySlots.push({
          date: slotDate,
          endDate: slotEndDate,
          startTime: slotStartTime as string,
          endTime: slotEndTime,
          totalSeats: slotTotalSeats,
          availableSeats: slotAvailableSeats,
          isAvailable: slotIsAvailable,
        });
      }
    }

    // Process images
    const imageUrls: string[] = [];
    const imageFilesToUpload: File[] = [];

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

        // Reject Base64 data strings inside tour creation payload
        if (trimmed.startsWith("data:") || trimmed.includes(";base64,")) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Base64 image data is not allowed in tour creation. Upload images directly to Cloudinary and provide secure URLs.",
            },
            { status: 400 }
          );
        }

        if (!/^https?:\/\//i.test(trimmed)) {
          return NextResponse.json(
            {
              success: false,
              message: `Invalid image URL: "${trimmed.slice(0, 50)}". Tour images must be secure HTTP/HTTPS URLs.`,
            },
            { status: 400 }
          );
        }

        imageUrls.push(trimmed);
      } else if (item instanceof File) {
        if (item.size > 0) {
          imageFilesToUpload.push(item);
        }
      }
    }

    // Total count validation
    if (imageUrls.length + imageFilesToUpload.length > 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum 10 tour images are allowed",
        },
        { status: 400 }
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      imageUrls.length + imageFilesToUpload.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one tour image is required",
        },
        { status: 400 }
      );
    }

    // Handle any legacy File uploads in multipart
    for (const file of imageFilesToUpload) {
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

      try {
        const uploadedUrl = await uploadTourImage(file);
        imageUrls.push(uploadedUrl);
      } catch (uploadError) {
        if (
          uploadError instanceof Error &&
          uploadError.message.startsWith("Cloudinary is not configured.")
        ) {
          const missing = getMissingCloudinaryCredentials();
          return NextResponse.json(
            {
              success: false,
              message: `Image upload is unavailable because Cloudinary is not configured. Missing: ${missing.join(", ")}`,
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: "Cloudinary image upload failed. Please try again.",
          },
          { status: 502 }
        );
      }
    }

    const itineraryDays = parsedItinerary.itineraryDays.map((day) => ({
      ...day,
      activities: [...day.activities],
    }));

    // If multipart had itinerary images uploaded directly as files
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
        try {
          itineraryDays[upload.dayIndex].activities[upload.activityIndex].image =
            await uploadTourImage(upload.file);
        } catch (error) {
          console.error("Itinerary image upload error:", error);
        }
      }
    }

    // Connect DB
    try {
      await connectDB();
    } catch (error) {
      console.error("POST /api/tours MongoDB connection error:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            "Could not connect to MongoDB. Check the database URI and network access.",
        },
        { status: 503 }
      );
    }

    // Auto-detect country/state from Destination if missing
    if ((!country || !state) && destination) {
      try {
        const placeName = destination.split(",")[0].trim();
        const destDoc = await Destination.findOne({
          name: { $regex: new RegExp(`^${escapeRegExp(placeName)}$`, "i") },
          isActive: true,
        })
          .select("country state")
          .lean();

        if (destDoc) {
          if (!country && destDoc.country) country = destDoc.country;
          if (!state && destDoc.state) state = destDoc.state;
        }
      } catch {
        // Non-fatal
      }
    }

    // Create tour
    let tour;

    try {
      tour = await Tour.create({
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
        operator: assignedOperatorId,
        createdBy: createdById,
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

    if (availabilitySlots.length > 0) {
      try {
        await Availability.insertMany(
          availabilitySlots.map((slot) => ({
            ...slot,
            tour: tour._id,
          }))
        );
      } catch (error) {
        console.error("POST /api/tours availability save error:", error);
        await Tour.findByIdAndDelete(tour._id);
        return NextResponse.json(
          {
            success: false,
            message: "Tour was created but its availability could not be saved. Please try again.",
          },
          { status: 500 }
        );
      }
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
    const destinationId = searchParams.get("destinationId");
    const activityType = searchParams.get("activityType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const duration = searchParams.get("duration");
    const durationUnit = searchParams.get("durationUnit");
    const mine = searchParams.get("mine");
    const all = searchParams.get("all");

    const filter: Record<string, unknown> = {};

    if (all === "true") {
      const token = request.cookies.get("token")?.value;
      if (!token) {
        return NextResponse.json(
          { success: false, message: "Authentication required" },
          { status: 401 }
        );
      }
      const user = await getRequestUser(token);
      if (!user || user.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Admin access required" },
          { status: 403 }
        );
      }
    } else if (mine === "true") {
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
    } else {
      filter.isActive = true;
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

    if (destinationId) {
      if (!mongoose.isValidObjectId(destinationId)) {
        return NextResponse.json(
          { success: false, message: "Invalid destination" },
          { status: 400 }
        );
      }

      const destinationDoc = await Destination.findOne({
        _id: destinationId,
        isActive: true,
      })
        .select("name country state city search")
        .lean();

      if (!destinationDoc) {
        return NextResponse.json(
          { success: false, message: "Destination not found" },
          { status: 404 }
        );
      }

      const terms = Array.from(
        new Set(
          [
            destinationDoc.name,
            destinationDoc.search,
            destinationDoc.country,
            destinationDoc.state,
            destinationDoc.city,
          ]
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter(Boolean)
        )
      );

      const pattern = terms.map(escapeRegExp).join("|");
      filter.destination = pattern
        ? { $regex: pattern, $options: "i" }
        : { $regex: "^$", $options: "i" };
    }

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
