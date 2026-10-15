import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  profileImage?: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: "user" | "operator" | "admin";
  createdAt: Date;
  updatedAt: Date;
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
      required: [true, "Last name is required"],
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
      required: [true, "Phone number is required"],
      trim: true,
    },

   role: {
  type: String,
  enum: ["user", "operator", "admin"],
  default: "user",
},
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;