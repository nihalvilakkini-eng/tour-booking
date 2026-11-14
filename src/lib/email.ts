import { Resend } from "resend";

type OperatorStatus = "approved" | "rejected";

type SendOperatorStatusEmailInput = {
  to: string;
  name?: string;
  businessName?: string;
  status: OperatorStatus;
  rejectionReason?: string;
};

type EmailSendResult = {
  success: boolean;
  id?: string;
  error?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Helper function to validate env and send email cleanly
async function dispatchEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  logContext: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.error(`${params.logContext} skipped: RESEND_API_KEY is not configured`);
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  if (!from) {
    console.error(`${params.logContext} skipped: EMAIL_FROM is not configured`);
    return { success: false, error: "EMAIL_FROM is not configured" };
  }

  if (!params.to) {
    console.error(`${params.logContext} skipped: recipient email is missing`);
    return { success: false, error: "Recipient email is missing" };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    if (result.error) {
      console.error(`Resend ${params.logContext} failed`, {
        to: params.to,
        error: result.error,
      });
      return {
        success: false,
        error: result.error.message || "Resend email request failed",
      };
    }

    const emailId = result.data?.id;
    console.info(`Resend ${params.logContext} sent`, {
      to: params.to,
      id: emailId,
    });

    return { success: true, id: emailId };
  } catch (error) {
    console.error(`Resend ${params.logContext} threw`, {
      to: params.to,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// 1. Operator Application Status Email (Existing)
export async function sendOperatorStatusEmail(
  input: SendOperatorStatusEmailInput
): Promise<EmailSendResult> {
  const approved = input.status === "approved";
  const applicantName = input.name?.trim() || "there";
  const businessName = input.businessName?.trim() || "your business";
  const subject = approved
    ? "Your WAYORA operator application was approved"
    : "Your WAYORA operator application was rejected";

  const text = approved
    ? `Hi ${applicantName},\n\nCongratulations! Your operator application for ${businessName} has been approved. You can now sign in and access the Operator Dashboard.\n\nWAYORA`
    : `Hi ${applicantName},\n\nYour operator application for ${businessName} was not approved.\n\nReason: ${input.rejectionReason?.trim() || "Not provided"}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>${approved ? "Operator application approved" : "Operator application rejected"}</h2>
      <p>Hi ${escapeHtml(applicantName)},</p>
      <p>${
        approved
          ? `Congratulations! Your operator application for <strong>${escapeHtml(businessName)}</strong> has been approved. You can now sign in and access the Operator Dashboard.`
          : `Your operator application for <strong>${escapeHtml(businessName)}</strong> was not approved.`
      }</p>
      ${
        approved
          ? ""
          : `<p><strong>Reason:</strong> ${escapeHtml(input.rejectionReason?.trim() || "Not provided")}</p>`
      }
      <p>WAYORA</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: `operator status email (${input.status})`,
  });
}

// 2. Customer Booking Submitted Email (NEW)
type SendBookingSubmittedEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingDate?: string;
  bookingUrl?: string;
};

export async function sendBookingSubmittedEmail(
  input: SendBookingSubmittedEmailInput
): Promise<EmailSendResult> {
  const customerName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingDate = input.bookingDate?.trim();
  const bookingUrl =
    input.bookingUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = `Booking request received: ${tourTitle}`;

  const text = `Hi ${customerName},\n\nWe have received your booking request for "${tourTitle}"${
    bookingDate ? ` on ${bookingDate}` : ""
  }. Our tour operator is reviewing your request and will notify you once it is confirmed.\n\nView My Bookings: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>Booking request received</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>We have received your booking request for <strong>${escapeHtml(tourTitle)}</strong>${
        bookingDate ? ` on <strong>${escapeHtml(bookingDate)}</strong>` : ""
      }.</p>
      <p>Our tour operator is reviewing your request and will notify you once it is confirmed.</p>
      <p><a href="${escapeHtml(bookingUrl)}">View My Bookings</a></p>
      <p>WAYORA</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: "booking submitted email",
  });
}

// 3. Operator Accepted Booking Email (Updated with Payment Deadline)
type SendBookingAcceptedEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingDate?: string;
  bookingUrl?: string;
};

export async function sendBookingAcceptedEmail(
  input: SendBookingAcceptedEmailInput
): Promise<EmailSendResult> {
  const customerName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingDate = input.bookingDate?.trim();
  const bookingUrl =
    input.bookingUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = "Your WAYORA booking was accepted - Action Required: Complete Payment";

  const text = `Hi ${customerName},\n\nGood news! Your booking for "${tourTitle}"${
    bookingDate ? ` on ${bookingDate}` : ""
  } has been accepted by the operator.\n\nPlease complete your payment within 2 days to confirm your tour. If payment is not completed within 2 days, your booking will be automatically cancelled.\n\nComplete Payment & View Bookings: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>Booking accepted - Payment required</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Good news! Your booking for <strong>${escapeHtml(tourTitle)}</strong>${
        bookingDate ? ` on <strong>${escapeHtml(bookingDate)}</strong>` : ""
      } has been accepted by the operator.</p>
      <p style="background-color:#fff3cd;padding:12px;border-left:4px solid #ffc107;margin:15px 0;">
        <strong>Important:</strong> Please complete your payment within <strong>2 days</strong> to confirm your tour. If the payment is not completed within this timeframe, your booking will be cancelled.
      </p>
      <p><a href="${escapeHtml(bookingUrl)}" style="background-color:#0f766e;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Complete Payment</a></p>
      <p>WAYORA</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: "booking accepted email",
  });
}
// 4. Operator Rejected Booking Email with Reason (NEW)
type SendBookingRejectedEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingDate?: string;
  rejectionReason?: string;
  bookingUrl?: string;
};

export async function sendBookingRejectedEmail(
  input: SendBookingRejectedEmailInput
): Promise<EmailSendResult> {
  const customerName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingDate = input.bookingDate?.trim();
  const reason = input.rejectionReason?.trim() || "Not provided";
  const bookingUrl =
    input.bookingUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = "Update on your WAYORA booking request";

  const text = `Hi ${customerName},\n\nUnfortunately, your booking request for "${tourTitle}"${
    bookingDate ? ` on ${bookingDate}` : ""
  } was rejected by the operator.\n\nReason: ${reason}\n\nView My Bookings: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>Booking request rejected</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Unfortunately, your booking request for <strong>${escapeHtml(tourTitle)}</strong>${
        bookingDate ? ` on <strong>${escapeHtml(bookingDate)}</strong>` : ""
      } was rejected by the operator.</p>
      <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
      <p><a href="${escapeHtml(bookingUrl)}">View My Bookings</a></p>
      <p>WAYORA</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: "booking rejected email",
  });
}
// 5. Customer Payment Receipt & Tour Confirmation Email (NEW)
type SendPaymentReceiptEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingDate?: string;
  amountPaid: number;
  currency?: string;
  bookingId: string;
  bookingUrl?: string;
};

export async function sendPaymentReceiptEmail(
  input: SendPaymentReceiptEmailInput
): Promise<EmailSendResult> {
  const customerName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingDate = input.bookingDate?.trim();
  const currency = input.currency || "INR";
  const amountPaid = input.amountPaid;
  const bookingId = input.bookingId;
  const bookingUrl =
    input.bookingUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = `Payment Successful - Receipt & Tour Confirmation (${tourTitle})`;

  const text = `Hi ${customerName},\n\nThank you! We have successfully received your payment of ${currency} ${amountPaid} for your tour "${tourTitle}"${
    bookingDate ? ` scheduled on ${bookingDate}` : ""
  }.\n\nBooking ID: ${bookingId}\nStatus: Confirmed & Paid\n\nYou can view your booking details and receipt here: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:20px;border-radius:8px;">
      <h2 style="color:#0f766e;margin-top:0;">Payment Receipt & Confirmation</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Thank you! We have successfully received your payment. Your tour is now fully confirmed.</p>
      
      <div style="background-color:#f8fafc;padding:15px;border-radius:6px;margin:20px 0;border:1px solid #e2e8f0;">
        <p style="margin:5px 0;"><strong>Tour:</strong> ${escapeHtml(tourTitle)}</p>
        ${bookingDate ? `<p style="margin:5px 0;"><strong>Date:</strong> ${escapeHtml(bookingDate)}</p>` : ""}
        <p style="margin:5px 0;"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
        <p style="margin:5px 0;"><strong>Amount Paid:</strong> ${escapeHtml(currency)} ${amountPaid}</p>
        <p style="margin:5px 0;"><strong>Payment Status:</strong> <span style="color:#16a34a;font-weight:bold;">Paid & Confirmed</span></p>
      </div>

      <p><a href="${escapeHtml(bookingUrl)}" style="background-color:#0f766e;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">View Booking & Receipt</a></p>
      <p style="margin-top:30px;font-size:12px;color:#64748b;">Thank you for booking with WAYORA.</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: "payment receipt email",
  });
}
// 6. Customer Payment Failed / Error Email (NEW)
type SendPaymentFailedEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingId: string;
  errorMessage?: string;
  bookingUrl?: string;
};

export async function sendPaymentFailedEmail(
  input: SendPaymentFailedEmailInput
): Promise<EmailSendResult> {
  const customerName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingId = input.bookingId;
  const errorMessage = input.errorMessage?.trim() || "Payment could not be processed.";
  const bookingUrl =
    input.bookingUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = `Payment Failed - Action Required for ${tourTitle}`;

  const text = `Hi ${customerName},\n\nWe encountered an error while processing your payment for "${tourTitle}".\n\nError Details: ${errorMessage}\n\nPlease go to My Bookings and try completing the payment again to secure your spot.\n\nView Bookings: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:20px;border-radius:8px;">
      <h2 style="color:#dc2626;margin-top:0;">Payment Failed</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>We encountered an error while processing your payment for <strong>${escapeHtml(tourTitle)}</strong>.</p>
      
      <div style="background-color:#fef2f2;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #dc2626;border:1px solid #fee2e2;">
        <p style="margin:5px 0;color:#991b1b;"><strong>Error Reason:</strong> ${escapeHtml(errorMessage)}</p>
        <p style="margin:5px 0;"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
      </div>

      <p>Please click the button below to retry your payment and confirm your tour:</p>
      <p><a href="${escapeHtml(bookingUrl)}" style="background-color:#0f766e;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">Retry Payment / View Bookings</a></p>
      <p style="margin-top:30px;font-size:12px;color:#64748b;">If you need assistance, please contact support.</p>
    </div>
  `;

  return dispatchEmail({
    to: input.to,
    subject,
    text,
    html,
    logContext: "payment failed email",
  });
}