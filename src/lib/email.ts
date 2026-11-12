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

// 3. Operator Accepted Booking Email (UPDATED - No payment required)
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

  const subject = "Your WAYORA booking was accepted";

  const text = `Hi ${customerName},\n\nGood news! Your booking for "${tourTitle}"${
    bookingDate ? ` on ${bookingDate}` : ""
  } has been accepted by the operator. You can check your booking details in My Bookings.\n\nOpen My Bookings: ${bookingUrl}\n\nWAYORA`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>Booking accepted</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Good news! Your booking for <strong>${escapeHtml(tourTitle)}</strong>${
        bookingDate ? ` on <strong>${escapeHtml(bookingDate)}</strong>` : ""
      } has been accepted by the operator. You can check your booking details in My Bookings.</p>
      <p><a href="${escapeHtml(bookingUrl)}">Open My Bookings</a></p>
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