
import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface IItineraryActivity {
  title: string;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  description: string;
  travelMode: string;
  latitude?: number;
  longitude?: number;
  image?: string;
  instructions?: string;
}

export interface IItineraryDay {
  dayNumber: number;
  title: string;
  activities: IItineraryActivity[];
}

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

  // Existing simple itinerary
  itinerary: string[];

  // Day-wise itinerary
  itineraryDays?: IItineraryDay[];

  highlights: string[];
  meetingPoint: string;
  inclusions: string[];
  exclusions: string[];
  images: string[];

  // Assigned operator
  operator: mongoose.Types.ObjectId;

  // User who created the tour
  createdBy?: mongoose.Types.ObjectId;

  rating: number;
  reviewCount: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ItineraryActivitySchema =
  new Schema<IItineraryActivity>(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      startTime: {
        type: String,
        required: true,
        trim: true,
      },

      endTime: {
        type: String,
        required: true,
        trim: true,
      },

      duration: {
        type: String,
        default: "",
        trim: true,
      },

      location: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      travelMode: {
        type: String,
        default: "other",
        trim: true,
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },

      image: {
        type: String,
        default: "",
        trim: true,
      },

      instructions: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      _id: true,
    }
  );

const ItineraryDaySchema =
  new Schema<IItineraryDay>(
    {
      dayNumber: {
        type: Number,
        required: true,
        min: 1,
      },

      title: {
        type: String,
        default: "",
        trim: true,
      },

      activities: {
        type: [ItineraryActivitySchema],
        default: [],
      },
    },
    {
      _id: true,
    }
  );

const TourSchema = new Schema<ITour>(
  {
    title: {
      type: String,
      required: [true, "Tour title is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Tour description is required"],
      trim: true,
    },

    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },

    activityType: {
      type: String,
      required: [true, "Activity type is required"],
      trim: true,
    },

    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1"],
    },

    durationUnit: {
      type: String,
      enum: ["hours", "days"],
      default: "hours",
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      validate: {
        validator: (value: number) => value > 0,
        message: "Price must be greater than zero",
      },
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    maxParticipants: {
      type: Number,
      required: [
        true,
        "Maximum participants is required",
      ],
      min: [
        1,
        "Maximum participants must be at least 1",
      ],
    },

    // Existing simple itinerary
    itinerary: {
      type: [String],
      default: [],
    },

    // Structured day-wise itinerary
    itineraryDays: {
      type: [ItineraryDaySchema],
      required: false,
    },

    highlights: {
      type: [String],
      default: [],
    },

    meetingPoint: {
      type: String,
      required: [true, "Meeting point is required"],
      trim: true,
    },

    inclusions: {
      type: [String],
      default: [],
    },

    exclusions: {
      type: [String],
      default: [],
    },

    // Cloudinary image URLs
    images: {
      type: [String],
      default: [],
    },

    // Operator assigned to this tour
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [
        true,
        "Tour operator is required",
      ],
    },

    // Admin or user who created this tour
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

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
