import { Resend } from "resend";

type OperatorStatus = "approved" | "rejected";

type SendOperatorStatusEmailInput = {
  to: string;
  name?: string;
  businessName?: string;
  status: OperatorStatus;
  rejectionReason?: string;
};

type SendOperatorStatusEmailResult = {
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

export async function sendOperatorStatusEmail(
  input: SendOperatorStatusEmailInput
): Promise<SendOperatorStatusEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.error("Operator status email skipped: RESEND_API_KEY is not configured");
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  if (!from) {
    console.error("Operator status email skipped: EMAIL_FROM is not configured");
    return { success: false, error: "EMAIL_FROM is not configured" };
  }

  if (!input.to) {
    console.error("Operator status email skipped: recipient email is missing");
    return { success: false, error: "Recipient email is missing" };
  }

  const approved = input.status === "approved";
  const applicantName = input.name?.trim() || "there";
  const businessName = input.businessName?.trim() || "your business";
  const subject = approved
    ? "Your WAYORA operator application was approved"
    : "Your WAYORA operator application was rejected";

  const text = approved
    ? `Hi ${applicantName},\n\nCongratulations! Your operator application for ${businessName} has been approved. You can now sign in and access the Operator Dashboard.\n\n- WAYORA`
    : `Hi ${applicantName},\n\nYour operator application for ${businessName} was not approved.\n\nReason: ${input.rejectionReason?.trim() || "Not provided"}\n\n- WAYORA`;

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

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject,
      text,
      html,
    });

    if (result.error) {
      console.error("Resend operator status email failed", {
        status: input.status,
        to: input.to,
        error: result.error,
      });
      return {
        success: false,
        error: result.error.message || "Resend email request failed",
      };
    }

    const emailId = result.data?.id;
    console.info("Resend operator status email sent", {
      status: input.status,
      to: input.to,
      id: emailId,
    });

    return { success: true, id: emailId };
  } catch (error) {
    console.error("Resend operator status email threw", {
      status: input.status,
      to: input.to,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

type SendBookingAcceptedEmailInput = {
  to: string;
  name?: string;
  tourTitle: string;
  bookingUrl?: string;
};

export async function sendBookingAcceptedEmail(
  input: SendBookingAcceptedEmailInput
): Promise<SendOperatorStatusEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.error("Booking accepted email skipped: RESEND_API_KEY is not configured");
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  if (!from) {
    console.error("Booking accepted email skipped: EMAIL_FROM is not configured");
    return { success: false, error: "EMAIL_FROM is not configured" };
  }

  if (!input.to) {
    console.error("Booking accepted email skipped: recipient email is missing");
    return { success: false, error: "Recipient email is missing" };
  }

  const applicantName = input.name?.trim() || "there";
  const tourTitle = input.tourTitle.trim() || "your tour";
  const bookingUrl =
    input.bookingUrl ||
    `${process.env.NEXT_PUBLIC_APP_URL || ""}/bookings`;

  const subject = "Your WAYORA booking was accepted";
  const text = `Hi ${applicantName},\n\nGood news! Your booking for "${tourTitle}" has been accepted. You can now open My Bookings and complete payment to confirm your booking.\n\nOpen My Bookings: ${bookingUrl}\n\n- WAYORA`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172b27">
      <h2>Booking accepted</h2>
      <p>Hi ${escapeHtml(applicantName)},</p>
      <p>Good news! Your booking for <strong>${escapeHtml(tourTitle)}</strong> has been accepted. You can now open My Bookings and complete payment to confirm your booking.</p>
      <p><a href="${escapeHtml(bookingUrl)}">Open My Bookings</a></p>
      <p>WAYORA</p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject,
      text,
      html,
    });

    if (result.error) {
      console.error("Resend booking accepted email failed", {
        to: input.to,
        error: result.error,
      });
      return {
        success: false,
        error: result.error.message || "Resend email request failed",
      };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error("Resend booking accepted email threw", {
      to: input.to,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}
