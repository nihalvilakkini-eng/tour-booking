/**
 * Client-side Razorpay Checkout loader and TypeScript definitions.
 * Ensures the Razorpay checkout script is loaded safely and reliably.
 */

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
}

export interface RazorpayTheme {
  color?: string;
  backdrop_color?: string;
  hide_topbar?: boolean;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in smallest currency unit (paise)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string>;
  theme?: RazorpayTheme;
  config?: Record<string, unknown>;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
    animation?: boolean;
    confirm_close?: boolean;
  };
}

export interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: "payment.failed", callback: (response: RazorpayFailureResponse) => void): void;
  on(event: string, callback: (response: unknown) => void): void;
}

export type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the Razorpay checkout script.
 * Handles duplicate calls, in-flight requests, and network errors.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // Already loaded and available on window
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  // Re-use active in-flight loading promise
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<boolean>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const handleLoad = () => {
        cleanup();
        resolve(true);
      };

      const handleError = () => {
        cleanup();
        existingScript.remove();
        razorpayScriptPromise = null;
        reject(
          new Error(
            "Failed to load Razorpay payment gateway. Please check your internet connection and try again."
          )
        );
      };

      const cleanup = () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      script.remove();
      razorpayScriptPromise = null;
      reject(
        new Error(
          "Failed to load Razorpay payment gateway. Please check your internet connection and try again."
        )
      );
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}
