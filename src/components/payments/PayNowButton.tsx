"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { loadRazorpayScript } from "@/lib/razorpay-client";

export interface PayNowButtonProps {
  bookingId: string;
  totalAmount?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tourTitle?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  disabled?: boolean;
  isProcessing?: boolean;
  onPaymentStart?: () => void;
  onPaymentEnd?: () => void;
  onSuccess?: (booking?: unknown) => void | Promise<void>;
  onError?: (errorMessage: string) => void;
  className?: string;
}

type PaymentPhase =
  | "idle"
  | "creating_order"
  | "opening_checkout"
  | "verifying"
  | "success";

export default function PayNowButton({
  bookingId,
  customerName = "",
  customerEmail = "",
  customerPhone = "",
  tourTitle = "",
  paymentStatus = "unpaid",
  disabled = false,
  isProcessing = false,
  onPaymentStart,
  onPaymentEnd,
  onSuccess,
  onError,
  className = "",
}: PayNowButtonProps) {
  const router = useRouter();

  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>("idle");
  const [error, setError] = useState<string>("");
  const isSubmittingRef = useRef<boolean>(false);

  const isLocalActive = paymentPhase !== "idle" && paymentPhase !== "success";
  const isDisabled = disabled || isProcessing || isLocalActive;

  async function notifyPaymentFailure(reason: string) {
    try {
      await fetch("/api/payment/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          reason: reason.slice(0, 300),
        }),
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("wayora-booking-change"));
      }
    } catch {
      // Non-blocking failure notification error
    }
  }

  async function handlePay() {
    // Prevent duplicate payment submissions while in progress
    if (isSubmittingRef.current || isDisabled) {
      return;
    }

    isSubmittingRef.current = true;
    setError("");
    setPaymentPhase("creating_order");
    onPaymentStart?.();

    try {
      // 1. Call create-order API
      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId }),
      });

      const orderResult = await orderResponse.json().catch(() => null);

      if (orderResponse.status === 401) {
        router.push(
          `/login?redirect=${encodeURIComponent("/bookings")}`
        );
        return;
      }

      if (!orderResponse.ok || !orderResult?.success) {
        const message =
          orderResult?.message ||
          "Unable to create payment order. Please try again.";
        throw new Error(message);
      }

      const orderData = orderResult.data;
      if (!orderData?.orderId) {
        throw new Error("Invalid payment order received from server.");
      }

      // 2. Load Razorpay script
      setPaymentPhase("opening_checkout");
      await loadRazorpayScript();

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error(
          "Payment gateway is currently unavailable. Please check your connection and try again."
        );
      }

      // 3. Initialize and open Razorpay Checkout
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        const settleOnce = (err?: Error) => {
          if (settled) return;
          settled = true;
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };

        const razorpayKey =
          orderData.keyId ||
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
          "";

        const razorpayInstance = new Razorpay({
          key: razorpayKey,
          amount: orderData.amount, // Already in smallest currency unit (paise) from backend
          currency: orderData.currency || "INR",
          name: "WAYORA",
          description: tourTitle
            ? `Tour: ${tourTitle}`
            : `Booking #${bookingId.slice(-8).toUpperCase()}`,
          order_id: orderData.orderId,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: {
            color: "#047857", // emerald-700
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay using UPI",
                  instruments: [
                    {
                      method: "upi",
                    },
                  ],
                },
                banks: {
                  name: "Netbanking",
                  instruments: [
                    {
                      method: "netbanking",
                    },
                  ],
                },
                cards: {
                  name: "Domestic Cards",
                  instruments: [
                    {
                      method: "card",
                    },
                  ],
                },
                wallets: {
                  name: "Wallets",
                  instruments: [
                    {
                      method: "wallet",
                    },
                  ],
                },
              },
              sequence: ["block.upi", "block.cards", "block.banks", "block.wallets"],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          handler: async (response) => {
            // 4. Server-side payment verification
            try {
              setPaymentPhase("verifying");

              const verifyResponse = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  bookingId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyResult = await verifyResponse
                .json()
                .catch(() => null);

              if (verifyResponse.status === 401) {
                router.push(
                  `/login?redirect=${encodeURIComponent("/bookings")}`
                );
                settleOnce();
                return;
              }

              if (!verifyResponse.ok || !verifyResult?.success) {
                throw new Error(
                  verifyResult?.message || "Payment signature verification failed."
                );
              }

              setPaymentPhase("success");

              // Refresh global navbar counts and notify app
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("wayora-booking-change"));
              }

              if (onSuccess) {
                await onSuccess(verifyResult.data);
              }

              settleOnce();
            } catch (verifyError) {
              const verifyMsg =
                verifyError instanceof Error
                  ? verifyError.message
                  : "Payment verification failed.";
              setError(verifyMsg);
              onError?.(verifyMsg);
              settleOnce(
                verifyError instanceof Error
                  ? verifyError
                  : new Error(verifyMsg)
              );
            }
          },
          modal: {
            ondismiss: () => {
              if (settled) return;
              const cancelMsg =
                "Payment was cancelled. You can retry payment whenever you are ready.";
              setError(cancelMsg);
              onError?.(cancelMsg);
              void notifyPaymentFailure("Payment cancelled by user");
              settleOnce(new Error("Payment cancelled"));
            },
          },
        });

        razorpayInstance.on("payment.failed", (failedResponse) => {
          if (settled) return;
          const rawReason =
            failedResponse?.error?.description ||
            failedResponse?.error?.reason ||
            "Payment attempt failed.";

          let failMsg = `Payment failed: ${rawReason}. You can retry payment.`;
          if (rawReason.toLowerCase().includes("international card")) {
            failMsg =
              "Payment failed: International cards are not enabled on this merchant account. Please pay using UPI, Netbanking, or a domestic Indian Debit/Credit card.";
          }

          setError(failMsg);
          onError?.(failMsg);
          void notifyPaymentFailure(rawReason);
          settleOnce(new Error(failMsg));
        });

        razorpayInstance.open();
      });
    } catch (payError) {
      const displayMsg =
        payError instanceof Error
          ? payError.message
          : "Unable to process payment. Please try again.";

      // Only display message if not a silent cancellation (which was already handled)
      if (displayMsg !== "Payment cancelled") {
        setError(displayMsg);
        onError?.(displayMsg);
      }
    } finally {
      if (paymentPhase !== "success") {
        setPaymentPhase("idle");
      }
      isSubmittingRef.current = false;
      onPaymentEnd?.();
    }
  }

  const isFailed = (paymentStatus || "").toLowerCase() === "failed";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          paymentPhase === "success"
            ? "bg-emerald-600"
            : isFailed
              ? "bg-emerald-700 hover:bg-emerald-800"
              : "bg-emerald-700 hover:bg-emerald-800"
        } ${className}`}
        aria-busy={isLocalActive}
      >
        {paymentPhase === "creating_order" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing...</span>
          </>
        ) : paymentPhase === "opening_checkout" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening Checkout...</span>
          </>
        ) : paymentPhase === "verifying" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying Payment...</span>
          </>
        ) : paymentPhase === "success" ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>Paid Successfully</span>
          </>
        ) : isFailed ? (
          <>
            <RotateCw className="h-4 w-4" />
            <span>Retry Payment</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            <span>Pay Now</span>
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-1.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 max-w-md"
        >
          <div className="flex items-start gap-1.5 font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          {error.toLowerCase().includes("international") && (
            <div className="mt-1 rounded-lg bg-white/80 p-2.5 text-[11px] text-slate-700 border border-red-100 space-y-1">
              <p className="font-semibold text-slate-900">💡 To complete payment in Test Mode:</p>
              <p>• Click <strong>Retry Payment</strong> above.</p>
              <p>• Click <strong>Netbanking</strong> → Select any bank (e.g. HDFC/SBI) → Click <strong>Success</strong>.</p>
              <p>• Or click <strong>Cards</strong> and use domestic test card: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-mono">4111 1111 1111 1111</code> (Expiry: 12/28, CVV: 123).</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
