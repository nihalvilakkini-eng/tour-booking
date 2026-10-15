import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAvailability extends Document {
  tour: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  availableSeats: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
  {
    tour: {
      type: Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Tour is required"],
    },

    date: {
      type: Date,
      required: [true, "Date is required"],
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      trim: true,
    },

    endTime: {
      type: String,
      trim: true,
    },

    totalSeats: {
      type: Number,
      required: [true, "Total seats are required"],
      min: [1, "Total seats must be at least 1"],
    },

    availableSeats: {
      type: Number,
      required: [true, "Available seats are required"],
      min: [0, "Available seats cannot be negative"],
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Availability: Model<IAvailability> =
  mongoose.models.Availability ||
  mongoose.model<IAvailability>(
    "Availability",
    AvailabilitySchema
  );

export default Availability;