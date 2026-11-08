
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

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
    | "accepted"
    | "confirmed"
    | "rejected"
    | "cancelled"
    | "completed";

  paymentStatus:
    | "unpaid"
    | "pending"
    | "paid"
    | "failed"
    | "refunded";

  rejectionReason?: string;
  paidAt?: Date | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    tour: {
      type: Schema.Types.ObjectId,
      ref: "Tour",
      required: true,
    },

    availability: {
      type: Schema.Types.ObjectId,
      ref: "Availability",
      required: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    participants: {
      type: Number,
      required: true,
      min: 1,
    },

    specialRequirements: {
      type: String,
      trim: true,
      default: "",
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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
        "accepted",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "unpaid",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
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
