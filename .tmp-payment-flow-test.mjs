import fs from "node:fs";
import crypto from "node:crypto";
import mongoose from "mongoose";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
const baseUrl = "http://localhost:3000";

if (!mongoUrl || !jwtSecret || !razorpaySecret) {
  throw new Error("Missing MONGODB_URL/MONGODB_URI, JWT_SECRET, or RAZORPAY_KEY_SECRET");
}

const jwt = (await import("jsonwebtoken")).default;
await mongoose.connect(mongoUrl);
const db = mongoose.connection.db;

const userId = new mongoose.Types.ObjectId();
const token = jwt.sign({ userId: userId.toString() }, jwtSecret);
const runId = Date.now();

await db.collection("users").insertOne({
  _id: userId,
  name: "Payment Flow Test",
  email: `payment-flow-${runId}@example.com`,
  role: "user",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createBooking(status, paymentStatus, extra = {}) {
  const id = new mongoose.Types.ObjectId();
  await db.collection("bookings").insertOne({
    _id: id,
    user: userId,
    customerName: "Payment Flow Test",
    customerEmail: `payment-flow-${runId}@example.com`,
    customerPhone: "9999999999",
    tour: new mongoose.Types.ObjectId(),
    availability: new mongoose.Types.ObjectId(),
    bookingDate: new Date("2026-12-01T00:00:00.000Z"),
    startTime: "10:00",
    participants: 1,
    specialRequirements: "",
    totalAmount: 1000,
    currency: "INR",
    status,
    paymentStatus,
    rejectionReason: "",
    paidAt: null,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  return id;
}

async function api(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `token=${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

const bookingIds = [];
const pendingId = await createBooking("pending", "unpaid");
const rejectedId = await createBooking("rejected", "unpaid", { rejectionReason: "test" });
const cancelledId = await createBooking("cancelled", "unpaid");
const acceptedId = await createBooking("accepted", "unpaid");
const paidId = await createBooking("confirmed", "paid", {
  razorpayOrderId: "order_paid_test",
  razorpayPaymentId: "pay_paid_test",
  paidAt: new Date(),
});
const retryId = await createBooking("accepted", "unpaid");
bookingIds.push(pendingId, rejectedId, cancelledId, acceptedId, paidId, retryId);

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name} ${detail}`);
  }
}

for (const [name, id, expected] of [
  ["pending booking cannot create order", pendingId, 400],
  ["rejected booking cannot create order", rejectedId, 400],
  ["cancelled booking cannot create order", cancelledId, 400],
  ["paid booking cannot create order", paidId, 409],
]) {
  const result = await api("/api/payment/create-order", { bookingId: id.toString() });
  check(name, result.status === expected, `status=${result.status} body=${JSON.stringify(result.body)}`);
}

const acceptedOrder = await api("/api/payment/create-order", { bookingId: acceptedId.toString() });
check(
  "accepted unpaid booking creates Razorpay order",
  acceptedOrder.status === 201 && acceptedOrder.body?.success === true && !!acceptedOrder.body?.data?.orderId,
  `status=${acceptedOrder.status} body=${JSON.stringify(acceptedOrder.body)}`
);
const orderId = acceptedOrder.body?.data?.orderId;

const acceptedDoc = await db.collection("bookings").findOne({ _id: acceptedId });
check(
  "order creation stores order id and pending payment status",
  acceptedDoc?.razorpayOrderId === orderId && acceptedDoc?.paymentStatus === "pending" && acceptedDoc?.status === "accepted",
  JSON.stringify({ status: acceptedDoc?.status, paymentStatus: acceptedDoc?.paymentStatus, razorpayOrderId: acceptedDoc?.razorpayOrderId })
);

const badVerify = await api("/api/payment/verify", {
  bookingId: acceptedId.toString(),
  razorpay_order_id: orderId,
  razorpay_payment_id: `pay_bad_${runId}`,
  razorpay_signature: "invalid_signature",
});
check("invalid signature is rejected", badVerify.status === 400, `status=${badVerify.status} body=${JSON.stringify(badVerify.body)}`);

const wrongOrderVerify = await api("/api/payment/verify", {
  bookingId: acceptedId.toString(),
  razorpay_order_id: "order_wrong_test",
  razorpay_payment_id: `pay_wrong_order_${runId}`,
  razorpay_signature: "invalid_signature",
});
check("wrong order id is rejected", wrongOrderVerify.status === 400, `status=${wrongOrderVerify.status} body=${JSON.stringify(wrongOrderVerify.body)}`);

const paymentId = `pay_test_${runId}`;
const signature = crypto
  .createHmac("sha256", razorpaySecret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

const goodVerify = await api("/api/payment/verify", {
  bookingId: acceptedId.toString(),
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: signature,
});
check(
  "valid signature confirms booking and marks paid",
  goodVerify.status === 200 && goodVerify.body?.success === true,
  `status=${goodVerify.status} body=${JSON.stringify(goodVerify.body)}`
);

const paidDoc = await db.collection("bookings").findOne({ _id: acceptedId });
check(
  "verified booking is confirmed/paid with payment id",
  paidDoc?.status === "confirmed" &&
    paidDoc?.paymentStatus === "paid" &&
    paidDoc?.razorpayPaymentId === paymentId &&
    paidDoc?.paidAt instanceof Date,
  JSON.stringify({ status: paidDoc?.status, paymentStatus: paidDoc?.paymentStatus, razorpayPaymentId: paidDoc?.razorpayPaymentId, paidAt: paidDoc?.paidAt })
);

const duplicateVerify = await api("/api/payment/verify", {
  bookingId: acceptedId.toString(),
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: signature,
});
check(
  "duplicate verification is idempotent",
  duplicateVerify.status === 200 && duplicateVerify.body?.success === true,
  `status=${duplicateVerify.status} body=${JSON.stringify(duplicateVerify.body)}`
);

const retryOrder1 = await api("/api/payment/create-order", { bookingId: retryId.toString() });
check(
  "retry booking creates first order",
  retryOrder1.status === 201 && retryOrder1.body?.success === true,
  `status=${retryOrder1.status} body=${JSON.stringify(retryOrder1.body)}`
);

const failResult = await api("/api/payment/failure", {
  bookingId: retryId.toString(),
  reason: "Payment cancelled by user",
});
const failedDoc = await db.collection("bookings").findOne({ _id: retryId });
check(
  "failed payment keeps booking accepted and retryable",
  failResult.status === 200 && failedDoc?.status === "accepted" && failedDoc?.paymentStatus === "failed",
  `status=${failResult.status} doc=${JSON.stringify({ status: failedDoc?.status, paymentStatus: failedDoc?.paymentStatus })}`
);

const retryOrder2 = await api("/api/payment/create-order", { bookingId: retryId.toString() });
check(
  "accepted failed booking can retry payment",
  retryOrder2.status === 201 && retryOrder2.body?.success === true,
  `status=${retryOrder2.status} body=${JSON.stringify(retryOrder2.body)}`
);

await db.collection("bookings").deleteMany({ _id: { $in: bookingIds } });
await db.collection("users").deleteOne({ _id: userId });
await mongoose.disconnect();

if (failures > 0) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("All payment flow checks passed");
