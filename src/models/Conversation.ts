import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConversation extends Document {
  type: "customer_operator" | "operator_admin";
  participants: mongoose.Types.ObjectId[];
  customer?: mongoose.Types.ObjectId;
  operator: mongoose.Types.ObjectId;
  admin?: mongoose.Types.ObjectId;
  booking?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageSender?: mongoose.Types.ObjectId;
  unreadCounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ["customer_operator", "operator_admin"],
      required: true,
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    operator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    lastMessage: {
      type: String,
      trim: true,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ type: 1, booking: 1 });
ConversationSchema.index({ type: 1, operator: 1, admin: 1 });
ConversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
