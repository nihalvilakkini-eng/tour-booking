import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;
const secret = process.env.JWT_SECRET;
if (!uri || !secret) throw new Error("Missing MongoDB or JWT env");

await mongoose.connect(uri);
const db = mongoose.connection.db;
const stamp = Date.now();

const user = await db.collection("users").insertOne({
  name: "TMP Tour Editor",
  email: `tmp-tour-edit-${stamp}@example.com`,
  password: "not-used",
  phone: "+10000000001",
  role: "operator",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const userId = String(user.insertedId);

const tour = await db.collection("tours").insertOne({
  title: "TMP Edit Tour",
  description: "Before edit",
  destination: "Old Place",
  activityType: "Old Activity",
  duration: 1,
  durationUnit: "hours",
  price: 100,
  currency: "INR",
  maxParticipants: 10,
  meetingPoint: "Old point",
  itinerary: ["old step"],
  itineraryDays: [],
  highlights: ["old highlight"],
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
  date: new Date("2030-02-01T00:00:00.000Z"),
  endDate: new Date("2030-02-02T00:00:00.000Z"),
  startTime: "09:00",
  endTime: "17:00",
  totalSeats: 5,
  availableSeats: 5,
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const token = jwt.sign({ userId }, secret, { expiresIn: "1h" });
const base = "http://localhost:3000";
const headers = { cookie: `token=${token}` };

async function api(path, init = {}) {
  const response = await fetch(base + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {}
  return { status: response.status, body, response };
}

try {
  const form = new FormData();
  form.append("title", "TMP Edit Tour Updated");
  form.append("description", "After edit");
  form.append("destination", "New Place");
  form.append("activityType", "New Activity");
  form.append("duration", "2");
  form.append("durationUnit", "hours");
  form.append("price", "150.50");
  form.append("currency", "USD");
  form.append("maxParticipants", "8");
  form.append("meetingPoint", "New point");
  form.append("itinerary", "step one\nstep two");
  form.append("highlights", "new highlight");
  form.append("inclusions", "entry");
  form.append("exclusions", "lunch");
  form.append(
    "itineraryDays",
    JSON.stringify([
      {
        dayNumber: 1,
        title: "Day 1",
        activities: [
          {
            title: "City walk",
            startTime: "09:00",
            endTime: "11:00",
            duration: "2 hours",
            location: "New Place",
            description: "Guided walk",
            travelMode: "walking",
            instructions: "Meet at gate",
            image: "",
          },
        ],
      },
    ])
  );

  let result = await api(`/api/tours/${tourId}`, { method: "PATCH", body: form });
  console.log("PATCH tour", result.status, result.body?.message || result.body?.success);

  let doc = await db.collection("tours").findOne({ _id: tour.insertedId });
  console.log("DB tour", {
    title: doc.title,
    destination: doc.destination,
    price: doc.price,
    currency: doc.currency,
    maxParticipants: doc.maxParticipants,
    itinerary: doc.itinerary,
    highlights: doc.highlights,
    itineraryDays: doc.itineraryDays?.length,
    images: doc.images,
  });

  result = await api(`/api/tours/${tourId}`, { method: "GET" });
  console.log("GET tour", result.status, result.body?.data?.title, result.body?.data?.itineraryDays?.length);

  const availDoc = await db.collection("availabilities").findOne({ _id: availability.insertedId });
  console.log("Availability preserved", availDoc ? { totalSeats: availDoc.totalSeats, isAvailable: availDoc.isAvailable } : null);

  const editPage = await fetch(`${base}/operator/tours/${tourId}/edit`, { headers });
  console.log("Edit page", editPage.status, editPage.headers.get("content-type"));

  const dashboardTours = await fetch(`${base}/operator/dashboard/tours`, { headers, redirect: "manual" });
  console.log("Dashboard tours", dashboardTours.status);
} finally {
  await db.collection("availabilities").deleteOne({ _id: availability.insertedId });
  await db.collection("tours").deleteOne({ _id: tour.insertedId });
  await db.collection("users").deleteOne({ _id: user.insertedId });
  await mongoose.disconnect();
}
