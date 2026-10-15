import mongoose from "mongoose";

const MONGODB_URL: string = (() => {
  const url = process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!url) {
    throw new Error("Please define MONGODB_URL or MONGODB_URI in .env.local");
  }
  return url;
})();

export default async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}