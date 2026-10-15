import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
import { createNotification } from "@/lib/notifications";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
  email: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserFromToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

// =========================
// POST - Create Booking
// =========================
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login to book a tour" },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      availabilityId,
      participants,
      specialRequirements = "",
    } = body;

    if (!availabilityId) {
      return NextResponse.json(
        {
          success: false,
          message: "Availability is required",
        },
        { status: 400 }
      );
    }

    if (!participants) {
      return NextResponse.json(
        {
          success: false,
          message: "Number of participants is required",
        },
        { status: 400 }
      );
    }

    const participantCount = Number(participants);

    if (!Number.isInteger(participantCount) || participantCount < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Participants must be at least 1",
        },
        { status: 400 }
      );
    }

    // Find availability
    const availability = await Availability.findOne({
      _id: availabilityId,
      isAvailable: true,
    });

    if (!availability) {
      return NextResponse.json(
        {
          success: false,
          message: "Availability not found or no longer available",
        },
        { status: 404 }
      );
    }

    // Check available seats
    if (availability.availableSeats < participantCount) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${availability.availableSeats} seat(s) are available`,
        },
        { status: 400 }
      );
    }

    // Find tour
    const tour = await Tour.findOne({
      _id: availability.tour,
      isActive: true,
    });

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found or inactive",
        },
        { status: 404 }
      );
    }

    // Check tour maximum participants
    if (participantCount > tour.maxParticipants) {
      return NextResponse.json(
        {
          success: false,
          message: `Maximum ${tour.maxParticipants} participants are allowed`,
        },
        { status: 400 }
      );
    }

    // Atomically reduce available seats
    const updatedAvailability = await Availability.findOneAndUpdate(
      {
        _id: availabilityId,
        isAvailable: true,
        availableSeats: {
          $gte: participantCount,
        },
      },
      {
        $inc: {
          availableSeats: -participantCount,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedAvailability) {
      return NextResponse.json(
        {
          success: false,
          message: "Not enough seats available",
        },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = tour.price * participantCount;

    try {
      // Create booking
      const booking = await Booking.create({
        user: user.userId,
        tour: tour._id,
        availability: availability._id,
        bookingDate: availability.date,
        startTime: availability.startTime,
        participants: participantCount,
        specialRequirements: String(specialRequirements).trim(),
        totalAmount,
        currency: tour.currency,
        status: "pending",
      });

      // If no seats remain, mark availability unavailable
      if (updatedAvailability.availableSeats === 0) {
        await Availability.findByIdAndUpdate(
          availabilityId,
          {
            isAvailable: false,
          }
        );
      }

      // =========================
      // Create notification for operator
      // =========================
      await createNotification({
        user: tour.operator,
        type: "booking_created",
        title: "New Booking Request",
        message: `You received a new booking request for "${tour.title}" from ${participantCount} participant(s).`,
        booking: booking._id,
        tour: tour._id,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Booking request created successfully",
          data: booking,
        },
        { status: 201 }
      );
    } catch (error) {
      // Roll back seats if booking creation fails
      await Availability.findByIdAndUpdate(
        availabilityId,
        {
          $inc: {
            availableSeats: participantCount,
          },
          $set: {
            isAvailable: true,
          },
        }
      );

      throw error;
    }
  } catch (error) {
    console.error("Create booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create booking",
      },
      { status: 500 }
    );
  }
}

// =========================
// GET - Get Bookings
// =========================
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const tourId = searchParams.get("tourId");

    let filter: Record<string, unknown> = {};

    // Normal user → own bookings
    if (user.role === "user") {
      filter.user = user.userId;
    }

    // Operator → bookings for their tours
    if (user.role === "operator") {
      const tours = await Tour.find({
        operator: user.userId,
      }).select("_id");

      const tourIds = tours.map((tour) => tour._id);

      filter.tour = {
        $in: tourIds,
      };
    }

    // Admin → all bookings
    if (user.role === "admin") {
      filter = {};
    }

    // Optional tour filter
    if (tourId) {
      filter.tour = tourId;
    }

    // Optional status filter
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("user", "name lastName email phone")
      .populate(
        "tour",
        "title destination activityType price currency duration durationUnit"
      )
      .populate(
        "availability",
        "date startTime endTime totalSeats availableSeats isAvailable"
      )
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: bookings.length,
        data: bookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get bookings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}