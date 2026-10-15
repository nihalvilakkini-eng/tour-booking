import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITour extends Document {
  title: string;
  description: string;
  destination: string;
  activityType: string;

  duration: number;
  durationUnit: "hours" | "days";

  price: number;
  currency: string;

  maxParticipants: number;

  itinerary: string[];
  highlights: string[];

  meetingPoint: string;

  inclusions: string[];
  exclusions: string[];

  images: string[];

  operator: mongoose.Types.ObjectId;

  rating: number;
  reviewCount: number;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const TourSchema = new Schema<ITour>(
  {
    // Tour name
    title: {
      type: String,
      required: [true, "Tour title is required"],
      trim: true,
    },

    // Tour description
    description: {
      type: String,
      required: [true, "Tour description is required"],
      trim: true,
    },

    // Tour destination
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },

    // Type of activity
    activityType: {
      type: String,
      required: [true, "Activity type is required"],
      trim: true,
    },

    // Duration number
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1"],
    },

    // Duration unit
    durationUnit: {
      type: String,
      enum: ["hours", "days"],
      default: "hours",
    },

    // Tour price
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    // Currency
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    // Maximum number of participants
    maxParticipants: {
      type: Number,
      required: [true, "Maximum participants is required"],
      min: [1, "Maximum participants must be at least 1"],
    },

    // Tour itinerary
    itinerary: {
      type: [String],
      default: [],
    },

    // Tour highlights
    highlights: {
      type: [String],
      default: [],
    },

    // Meeting point
    meetingPoint: {
      type: String,
      required: [true, "Meeting point is required"],
      trim: true,
    },

    // What is included
    inclusions: {
      type: [String],
      default: [],
    },

    // What is not included
    exclusions: {
      type: [String],
      default: [],
    },

    // Cloudinary image URLs
    images: {
      type: [String],
      default: [],
    },

    // User/operator who created the tour
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tour operator is required"],
    },

    // Average rating
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Number of reviews
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tour active/inactive status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Tour: Model<ITour> =
  mongoose.models.Tour ||
  mongoose.model<ITour>("Tour", TourSchema);

export default Tour;