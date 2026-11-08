import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
