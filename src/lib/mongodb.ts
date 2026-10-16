import mongoose from "mongoose";

type MongooseCache = {
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached =
  globalWithMongoose.mongooseCache ??
  (globalWithMongoose.mongooseCache = {
    promise: null,
  });

export default async function connectDB(): Promise<typeof mongoose> {
  const url = process.env.MONGODB_URL || process.env.MONGODB_URI;

  if (!url) {
    throw new Error("Please define MONGODB_URL or MONGODB_URI in .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(url);
  }

  try {
    await cached.promise;
    return mongoose;
  } catch (error) {
    cached.promise = null;
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}