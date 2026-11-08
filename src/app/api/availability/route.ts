
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Availability from "@/models/Availability";
import Booking from "@/models/Booking";
import Tour from "@/models/Tour";
import { getRequestUser, type RequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// CREATE AVAILABILITY
// Admin: any tour
// Operator: own tours only
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return jsonError("Authentication required", 401);
    }

    const user: RequestUser | null = await getRequestUser(token);
    if (!user) {
      return jsonError("Invalid or expired login session", 401);
    }

    const { userId, role } = user;

    if (role !== "admin" && role !== "operator") {
      return jsonError(
        "Only admins and operators can create availability",
        403
      );
    }

    await connectDB();

    const body = await request.json();

    const {
      tourId,
      date,
      endDate,
      startTime,
      endTime,
      totalSeats,
      availableSeats,
      isAvailable,
    } = body;

    if (
      typeof tourId !== "string" ||
      !mongoose.isValidObjectId(tourId)
    ) {
      return jsonError("A valid Tour ID is required", 400);
    }

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return jsonError(
        "Date is required in YYYY-MM-DD format",
        400
      );
    }

    const selectedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.toISOString().slice(0, 10) !== date
    ) {
      return jsonError("Please provide a valid date", 400);
    }

    // Prevent creating availability for a past date.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return jsonError("Availability date cannot be in the past", 400);
    }

    const validTime = (value: unknown) =>
      typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

    if (!validTime(startTime)) {
      return jsonError(
        "Start time is required in HH:MM format",
        400
      );
    }

    if (endTime !== undefined && endTime !== "" && !validTime(endTime)) {
      return jsonError(
        "End time must be in HH:MM format",
        400
      );
    }

    if (
      typeof endDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return jsonError(
        "End date is required in YYYY-MM-DD format",
        400
      );
    }

    const selectedEndDate = new Date(`${endDate}T00:00:00.000Z`);
    if (
      Number.isNaN(selectedEndDate.getTime()) ||
      selectedEndDate.toISOString().slice(0, 10) !== endDate
    ) {
      return jsonError("Please provide a valid end date", 400);
    }

    if (selectedEndDate < selectedDate) {
      return jsonError("Ending date cannot be before the starting date", 400);
    }

    if (endTime && endTime <= startTime) {
      return jsonError("End time must be after start time", 400);
    }

    if (!Number.isInteger(totalSeats) || totalSeats < 1) {
      return jsonError(
        "Total seats must be a whole number greater than zero",
        400
      );
    }

    const requestedAvailableSeats =
      availableSeats === undefined ? totalSeats : Number(availableSeats);

    if (
      !Number.isInteger(requestedAvailableSeats) ||
      requestedAvailableSeats < 0 ||
      requestedAvailableSeats > totalSeats
    ) {
      return jsonError(
        "Available seats must be between 0 and total seats",
        400
      );
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return jsonError("Tour not found", 404);
    }

    // Operators can manage only their own tours.
    // Admins can manage availability for any tour.
    if (
      role === "operator" &&
      String(tour.operator) !== userId
    ) {
      return jsonError(
        "You can only add availability for your own tours",
        403
      );
    }

    if (totalSeats > tour.maxParticipants) {
      return jsonError(
        `Total seats cannot exceed maximum participants (${tour.maxParticipants})`,
        400
      );
    }

    // Check for an existing slot on the same date and start time.
    const nextDate = new Date(selectedDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const existingAvailability = await Availability.findOne({
      tour: tourId,
      date: {
        $gte: selectedDate,
        $lt: nextDate,
      },
      startTime,
    });

    if (existingAvailability) {
      return jsonError(
        "Availability already exists for this date and start time",
        409
      );
    }

    if (isAvailable !== undefined && typeof isAvailable !== "boolean") {
      return jsonError("Availability status must be true or false", 400);
    }

    const availability = await Availability.create({
      tour: tourId,
      date: selectedDate,
      endDate: selectedEndDate,
      startTime,
      endTime: endTime || "",
      totalSeats,
      availableSeats: requestedAvailableSeats,
      isAvailable: isAvailable ?? true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Availability created successfully",
        data: availability,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create availability error:", error);

    return jsonError("Failed to create availability", 500);
  }
}

// GET AVAILABILITY
// Customers can see bookable slots.
// Optional query parameters: tourId and date.
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get("tourId");
    const date = searchParams.get("date");
    const manage = searchParams.get("manage") === "true";

    if (manage) {
      const token = request.cookies.get("token")?.value;
      const user: RequestUser | null = await getRequestUser(token);

      if (!user || (user.role !== "admin" && user.role !== "operator")) {
        return jsonError("Authentication required", 401);
      }

      const manageFilter: Record<string, unknown> = {};
      if (user.role === "operator") {
        const ownedTours = await Tour.find({ operator: user.userId }).select("_id").lean();
        const ownedTourIds = ownedTours.map((tour) => tour._id);
        if (tourId) {
          if (!mongoose.isValidObjectId(tourId)) return jsonError("Invalid Tour ID", 400);
          if (!ownedTourIds.some((ownedId) => String(ownedId) === tourId)) {
            return jsonError("Tour not found or access denied", 404);
          }
          manageFilter.tour = tourId;
        } else {
          manageFilter.tour = { $in: ownedTourIds };
        }
      } else if (tourId) {
        if (!mongoose.isValidObjectId(tourId)) return jsonError("Invalid Tour ID", 400);
        manageFilter.tour = tourId;
      }

      const managedAvailability = await Availability.find(manageFilter)
        .populate("tour", "title destination images")
        .sort({ date: 1, startTime: 1 })
        .lean();

      return NextResponse.json({ success: true, data: managedAvailability });
    }

    const filter: Record<string, unknown> = {
      isAvailable: true,
      availableSeats: { $gt: 0 },
    };

    if (tourId) {
      if (!mongoose.isValidObjectId(tourId)) {
        return jsonError("Invalid Tour ID", 400);
      }

      filter.tour = tourId;
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonError(
          "Date must be in YYYY-MM-DD format",
          400
        );
      }

      const selectedDate = new Date(`${date}T00:00:00.000Z`);

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.toISOString().slice(0, 10) !== date
      ) {
        return jsonError("Please provide a valid date", 400);
      }

      const nextDate = new Date(selectedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      filter.date = {
        $gte: selectedDate,
        $lt: nextDate,
      };
    }

    const availability = await Availability.find(filter)
      .populate(
        "tour",
        "title destination activityType price duration durationUnit"
      )
      .sort({ date: 1, startTime: 1 });

    return NextResponse.json(
      {
        success: true,
        count: availability.length,
        data: availability,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get availability error:", error);

    return jsonError("Failed to fetch availability", 500);
  }
}

// PATCH - Update an availability record.
// Admins can update any tour; operators only their own tours.
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const user = await getRequestUser(token);

    if (!user || (user.role !== "admin" && user.role !== "operator")) {
      return jsonError("Authentication required", 401);
    }

    await connectDB();

    const body = await request.json();
    const {
      availabilityId,
      date,
      endDate,
      startTime,
      endTime,
      totalSeats,
      availableSeats,
      isAvailable,
    } = body ?? {};

    if (typeof availabilityId !== "string" || !mongoose.isValidObjectId(availabilityId)) {
      return jsonError("A valid availability ID is required", 400);
    }

    const availability = await Availability.findById(availabilityId);
    if (!availability) return jsonError("Availability not found", 404);

    const tour = await Tour.findById(availability.tour);
    if (!tour) return jsonError("Tour not found", 404);

    if (user.role === "operator" && String(tour.operator) !== user.userId) {
      return jsonError("Availability not found or access denied", 404);
    }

    const parseDateInput = (value: unknown, fallback: Date) => {
      if (value === undefined || value === null || value === "") {
        return fallback;
      }
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
        ? null
        : parsed;
    };

    const nextDate = parseDateInput(date, availability.date);
    const nextEndDate = parseDateInput(
      endDate,
      availability.endDate ?? availability.date
    );

    if (!nextDate || !nextEndDate) {
      return jsonError("Invalid date. Use YYYY-MM-DD format", 400);
    }
    if (nextEndDate < nextDate) {
      return jsonError("Ending date cannot be before the starting date", 400);
    }

    const bookedBookings = await Booking.find({
      availability: availability._id,
      status: { $in: ["pending", "accepted", "confirmed", "completed"] },
    })
      .select("participants")
      .lean();
    const bookedSeats = bookedBookings.reduce(
      (total, booking) => total + (booking.participants || 0),
      0
    );

    const nextTotalSeats = totalSeats === undefined ? availability.totalSeats : Number(totalSeats);
    const nextAvailableSeats = availableSeats === undefined
      ? totalSeats === undefined
        ? availability.availableSeats
        : Math.max(0, nextTotalSeats - bookedSeats)
      : Number(availableSeats);

    if (!Number.isInteger(nextTotalSeats) || nextTotalSeats < 1) {
      return jsonError("Total seats must be at least 1", 400);
    }
    if (nextTotalSeats > tour.maxParticipants) {
      return jsonError(
        `Total seats cannot exceed maximum participants (${tour.maxParticipants})`,
        400
      );
    }
    if (
      !Number.isInteger(nextAvailableSeats) ||
      nextAvailableSeats < bookedSeats ||
      nextAvailableSeats > nextTotalSeats
    ) {
      return jsonError("Available slots cannot be less than booked seats", 400);
    }

    const validTime = (value: unknown) =>
      typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const nextStartTime = startTime ?? availability.startTime;
    const nextEndTime = endTime ?? availability.endTime ?? "";

    if (!validTime(nextStartTime)) return jsonError("Invalid start time", 400);
    if (nextEndTime && (!validTime(nextEndTime) || nextEndTime <= nextStartTime)) {
      return jsonError("End time must be after start time", 400);
    }

    const nextDay = new Date(nextDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const duplicateAvailability = await Availability.findOne({
      _id: { $ne: availability._id },
      tour: availability.tour,
      date: { $gte: nextDate, $lt: nextDay },
      startTime: nextStartTime,
    });

    if (duplicateAvailability) {
      return jsonError(
        "Availability already exists for this date and start time",
        409
      );
    }

    availability.date = nextDate;
    availability.endDate = nextEndDate;
    availability.startTime = nextStartTime;
    availability.endTime = nextEndTime;
    availability.totalSeats = nextTotalSeats;
    availability.availableSeats = nextAvailableSeats;

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return jsonError("Availability status must be true or false", 400);
      }
      availability.isAvailable = isAvailable;
    }

    await availability.save();

    return NextResponse.json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    return jsonError("Failed to update availability", 500);
  }
}

// DELETE - Remove an availability slot. Slots with bookings are deactivated
// instead of deleted so existing booking records remain intact.
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const user = await getRequestUser(token);

    if (!user || (user.role !== "admin" && user.role !== "operator")) {
      return jsonError("Authentication required", 401);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const availabilityId = searchParams.get("id");

    if (!availabilityId || !mongoose.isValidObjectId(availabilityId)) {
      return jsonError("A valid availability ID is required", 400);
    }

    const availability = await Availability.findById(availabilityId);
    if (!availability) return jsonError("Availability not found", 404);

    const tour = await Tour.findById(availability.tour);
    if (!tour) return jsonError("Tour not found", 404);

    if (user.role === "operator" && String(tour.operator) !== user.userId) {
      return jsonError("Availability not found or access denied", 404);
    }

    const bookingCount = await Booking.countDocuments({ availability: availability._id });

    if (bookingCount > 0) {
      availability.isAvailable = false;
      await availability.save();
      return NextResponse.json({
        success: true,
        message: "Availability has bookings, so it was deactivated instead of deleted",
        data: availability,
      });
    }

    await Availability.findByIdAndDelete(availability._id);

    return NextResponse.json({
      success: true,
      message: "Availability deleted successfully",
    });
  } catch (error) {
    console.error("Delete availability error:", error);
    return jsonError("Failed to delete availability", 500);
  }
}
