import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type:
    | "booking_created"
    | "booking_confirmed"
    | "booking_rejected"
    | "booking_cancelled"
    | "booking_completed"
    | "tour_update";
  title: string;
  message: string;
  booking?: mongoose.Types.ObjectId;
  tour?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    type: {
      type: String,
      enum: [
        "booking_created",
        "booking_confirmed",
        "booking_rejected",
        "booking_cancelled",
        "booking_completed",
        "tour_update",
      ],
      required: [true, "Notification type is required"],
    },

    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },

    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },

    tour: {
      type: Schema.Types.ObjectId,
      ref: "Tour",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>(
    "Notification",
    NotificationSchema
  );

export default Notification;