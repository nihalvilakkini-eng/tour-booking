import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
import Review from "@/models/Review";
import { createNotification } from "@/lib/notifications";
import User from "@/models/User";
import { isBookingCompleted } from "@/lib/booking-status";
import { getRequestUser } from "@/lib/request-user";
import { sendBookingSubmittedEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

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

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const customer = await User.findById(user.userId).select(
      "name lastName email phone"
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!customer.name || !customer.email || !customer.phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete your name, email and phone in your profile before booking.",
        },
        { status: 400 }
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
        customerName: `${customer.name} ${customer.lastName || ""}`.trim(),
        customerEmail: customer.email,
        customerPhone: customer.phone,
        totalAmount,
        currency: tour.currency,
        status: "pending",
      });

      // If no seats remain, mark availability unavailable
      if (updatedAvailability.availableSeats === 0) {
        await Availability.findByIdAndUpdate(availabilityId, {
          isAvailable: false,
        });
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

      // =========================
      // Create notification for traveller
      // =========================
      await createNotification({
        user: user.userId,
        type: "booking_created",
        title: "Booking Request Submitted",
        message: `Your booking request for "${tour.title}" has been submitted and is pending operator review.`,
        booking: booking._id,
        tour: tour._id,
      });

      // =========================
      // Send Booking Submitted Email to Customer
      // =========================
      await sendBookingSubmittedEmail({
        to: booking.customerEmail,
        name: booking.customerName,
        tourTitle: tour.title,
        bookingDate: new Date(booking.bookingDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
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
      await Availability.findByIdAndUpdate(availabilityId, {
        $inc: {
          availableSeats: participantCount,
        },
        $set: {
          isAvailable: true,
        },
      });

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

    const user = await getRequestUser(token);
    if (!user) {
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

    const reviewedBookings = bookings.length
      ? new Set(
          (
            await Review.find({
              booking: { $in: bookings.map((booking) => booking._id) },
            })
              .select("booking")
              .lean()
          ).map((review) => String(review.booking))
        )
      : new Set<string>();

    const bookingsWithReviewStatus = bookings.map((booking) => ({
      ...booking.toObject(),
      reviewSubmitted: reviewedBookings.has(String(booking._id)),
      reviewEligible:
        user.role === "user" && isBookingCompleted(booking.status),
    }));

    return NextResponse.json(
      {
        success: true,
        count: bookings.length,
        data: bookingsWithReviewStatus,
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