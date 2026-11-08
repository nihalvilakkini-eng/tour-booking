import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;
const secret = process.env.JWT_SECRET;
if (!uri || !secret) throw new Error("Missing MongoDB or JWT env");

await mongoose.connect(uri);
const db = mongoose.connection.db;
const stamp = Date.now();

const user = await db.collection("users").insertOne({
  name: "TMP Operator",
  email: `tmp-operator-availability-${stamp}@example.com`,
  password: "not-used",
  phone: "+10000000000",
  role: "operator",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const userId = String(user.insertedId);

const tour = await db.collection("tours").insertOne({
  title: "TMP Availability Tour",
  description: "Temporary availability test tour",
  destination: "Testville",
  activityType: "Test",
  duration: 1,
  durationUnit: "hours",
  price: 100,
  currency: "INR",
  maxParticipants: 10,
  meetingPoint: "Test point",
  itinerary: [],
  itineraryDays: [],
  highlights: [],
  inclusions: [],
  exclusions: [],
  images: [],
  operator: new mongoose.Types.ObjectId(userId),
  rating: 0,
  reviewCount: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const tourId = String(tour.insertedId);

const availability = await db.collection("availabilities").insertOne({
  tour: new mongoose.Types.ObjectId(tourId),
  date: new Date("2030-01-10T00:00:00.000Z"),
  endDate: new Date("2030-01-12T00:00:00.000Z"),
  startTime: "09:00",
  endTime: "17:00",
  totalSeats: 5,
  availableSeats: 5,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const availabilityId = String(availability.insertedId);

const token = jwt.sign({ userId }, secret, { expiresIn: "1h" });
const base = "http://localhost:3000";
const headers = {
  cookie: `token=${token}`,
  "content-type": "application/json",
};

async function api(path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {}
  return { status: response.status, body };
}

try {
  let result = await api("/api/operator/availability");
  console.log("GET availability", result.status, "count", result.body?.data?.length);

  result = await api("/api/operator/availability", {
    method: "PATCH",
    body: JSON.stringify({
      availabilityId,
      date: "2030-01-15",
      endDate: "2030-01-16",
      startTime: "10:00",
      endTime: "18:00",
      totalSeats: 6,
      availableSeats: 4,
      isAvailable: true,
    }),
  });
  console.log("PATCH edit", result.status, result.body?.message || result.body?.success);

  let doc = await db.collection("availabilities").findOne({ _id: availability.insertedId });
  console.log("DB after edit", {
    date: doc.date,
    endDate: doc.endDate,
    startTime: doc.startTime,
    endTime: doc.endTime,
    totalSeats: doc.totalSeats,
    availableSeats: doc.availableSeats,
    isAvailable: doc.isAvailable,
  });

  result = await api("/api/operator/availability", {
    method: "PATCH",
    body: JSON.stringify({ availabilityId, isAvailable: false }),
  });
  console.log("PATCH deactivate", result.status, result.body?.message || result.body?.success);
  doc = await db.collection("availabilities").findOne({ _id: availability.insertedId });
  console.log("DB isAvailable after deactivate", doc.isAvailable);

  result = await api("/api/operator/availability", {
    method: "PATCH",
    body: JSON.stringify({ availabilityId, isAvailable: true }),
  });
  console.log("PATCH activate", result.status, result.body?.message || result.body?.success);
  doc = await db.collection("availabilities").findOne({ _id: availability.insertedId });
  console.log("DB isAvailable after activate", doc.isAvailable);

  result = await api("/api/operator/availability");
  const item = result.body?.data?.find((entry) => entry._id === availabilityId);
  console.log("GET reflects", item ? {
    date: item.date,
    startTime: item.startTime,
    totalSeats: item.totalSeats,
    availableSeats: item.availableSeats,
    isAvailable: item.isAvailable,
  } : null);
} finally {
  await db.collection("availabilities").deleteOne({ _id: availability.insertedId });
  await db.collection("tours").deleteOne({ _id: tour.insertedId });
  await db.collection("users").deleteOne({ _id: user.insertedId });
  await mongoose.disconnect();
}
