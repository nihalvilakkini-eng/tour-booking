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
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;

  if (!uri) {
    throw new Error(
      "MongoDB is not configured. Set MONGODB_URI (or MONGODB_URL) in the server environment. On Vercel, add it under Project Settings > Environment Variables for the deployed environment, then redeploy."
    );
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
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