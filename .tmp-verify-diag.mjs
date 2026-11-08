import fs from "node:fs";
import mongoose from "mongoose";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const jwt = (await import("jsonwebtoken")).default;
await mongoose.connect(process.env.MONGODB_URL || process.env.MONGODB_URI);
const db = mongoose.connection.db;
const userId = new mongoose.Types.ObjectId();
const token = jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET);
await db.collection("users").insertOne({ _id: userId, role: "user", isActive: true, name: "Verify Diag", email: `verify-diag-${Date.now()}@example.com`, createdAt: new Date(), updatedAt: new Date() });

async function post(path, body) {
  const res = await fetch(`http://localhost:3000${path}`, { method: "POST", headers: { "Content-Type": "application/json", cookie: `token=${token}` }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log("verify empty", await post("/api/payment/verify", {}));
console.log("verify missing booking", await post("/api/payment/verify", { bookingId: new mongoose.Types.ObjectId().toString(), razorpay_order_id: "o", razorpay_payment_id: "p", razorpay_signature: "s" }));
console.log("create-order missing booking", await post("/api/payment/create-order", { bookingId: new mongoose.Types.ObjectId().toString() }));

await db.collection("users").deleteOne({ _id: userId });
await mongoose.disconnect();
