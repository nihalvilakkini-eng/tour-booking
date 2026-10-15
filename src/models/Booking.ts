import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  tour: mongoose.Types.ObjectId;
  availability: mongoose.Types.ObjectId;

  bookingDate: Date;
  startTime: string;

  participants: number;
  specialRequirements?: string;

  totalAmount: number;
  currency: string;

  status:
    | "pending"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "completed";

  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    tour: {
      type: Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Tour is required"],
    },

    availability: {
      type: Schema.Types.ObjectId,
      ref: "Availability",
      required: [true, "Availability is required"],
    },

    bookingDate: {
      type: Date,
      required: [true, "Booking date is required"],
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },

    participants: {
      type: Number,
      required: [true, "Number of participants is required"],
      min: [1, "At least 1 participant is required"],
    },

    specialRequirements: {
      type: String,
      trim: true,
      default: "",
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;