import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type OperatorApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IOperatorApplication {
  businessName: string;
  businessType: string;
  businessDescription: string;
  phone: string;
  businessEmail: string;
  country: string;
  state: string;
  city: string;
  businessAddress: string;
  yearsOfExperience: number;
  website?: string;
  registrationNumber?: string;
  status: OperatorApplicationStatus;
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
}

export interface IUser extends Document {
  profileImage?: string;
  name: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  role: "user" | "operator" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  operatorApplication?: IOperatorApplication;
}

const UserSchema = new Schema<IUser>(
  {
    profileImage: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "operator", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    operatorApplication: {
      businessName: { type: String, trim: true },
      businessType: {
        type: String,
        enum: [
          "Travel Agency",
          "Tour Operator",
          "Adventure Activity Provider",
          "Local Tour Guide",
          "Trekking Organizer",
          "Resort / Hotel",
          "Other",
        ],
      },
      businessDescription: { type: String, trim: true },
      phone: { type: String, trim: true },
      businessEmail: { type: String, lowercase: true, trim: true },
      country: { type: String, trim: true },
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      businessAddress: { type: String, trim: true },
      yearsOfExperience: { type: Number, min: 0 },
      website: { type: String, trim: true },
      registrationNumber: { type: String, trim: true },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      rejectionReason: { type: String, default: "" },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      submittedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
