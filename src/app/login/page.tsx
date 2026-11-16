"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get("reason") === "account-deactivated"
      ? "This account has been deactivated. Please contact Wayora support for help."
      : ""
  );

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const result: {
        success?: boolean;
        message?: string;
        token?: string;
        data?: { role?: string; token?: string };
      } = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login failed");
      }

      const authToken = result.token || result.data?.token;
      if (authToken && typeof window !== "undefined") {
        localStorage.setItem("wayora_token", authToken);
        localStorage.setItem("token", authToken);
      }

      const role = result.data?.role;
      const roleRedirect =
        role === "admin"
          ? "/admin/dashboard"
          : role === "operator"
            ? "/operator/dashboard"
            : role === "user"
              ? "/"
              : null;

      if (!roleRedirect) {
        throw new Error("Login response did not include a valid account role.");
      }

      window.dispatchEvent(new Event("wayora-auth-change"));

      const redirect = searchParams.get("redirect");
      const safeUserRedirect =
        role === "user" &&
        redirect?.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.startsWith("/\\")
          ? redirect
          : null;

      router.push(safeUserRedirect ?? roleRedirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page dark-auth-page">
      <div className="auth-background" />

      <Link href="/" className="auth-logo">
        wayora<span>.</span>
      </Link>

      <Link href="/" className="back-home">
        ← Back to home
      </Link>

      <section className="auth-layout">
        <div className="auth-intro">
          <span className="auth-tag">✦ YOUR NEXT ADVENTURE STARTS HERE</span>

          <h1>
            The world is
            <br />
            waiting <span>for you.</span>
          </h1>

          <p>
            Discover extraordinary places, unforgettable experiences
            and journeys worth remembering.
          </p>

          <div className="travel-note">
            <span className="note-icon">✦</span>
            <div>
              <strong>Your journey, your story.</strong>
              <small>Explore more. Experience more.</small>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="card-icon">✈</div>

          <p className="card-eyebrow">WELCOME BACK</p>
          <h2>Sign in to Wayora</h2>
          <p className="card-description">
            Continue your journey with us.
          </p>

          <form onSubmit={handleLogin} autoComplete="off">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />

            <div className="password-heading">
              <label htmlFor="password">Password</label>
            </div>

            <div className="password-box">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-divider">
            <span>NEW TO WAYORA?</span>
          </div>

          <Link href="/register" className="auth-secondary">
            Create an account
          </Link>

          <p className="auth-terms">
            By continuing, you agree to our terms and privacy policy.
          </p>
        </div>
      </section>

      <style jsx>{`
        .dark-auth-page {
          background: #0b1116 !important;
          color: #f1f5f9 !important;
          min-height: 100vh;
          position: relative;
        }

        .auth-background {
          position: fixed;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(
              135deg,
              rgba(11, 17, 22, 0.90) 0%,
              rgba(11, 17, 22, 0.72) 45%,
              rgba(11, 17, 22, 0.92) 100%
            ),
            url("/images/swiss-alps.jpg") center / cover no-repeat !important;
          transform: scale(1.02);
          filter: saturate(1.15);
        }

        .auth-logo {
          color: #ffffff !important;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          transition: transform 0.2s ease;
        }

        .auth-logo:hover {
          transform: translateY(-1px);
        }

        .auth-logo span {
          color: #f59e0b !important;
        }

        .back-home {
          color: #cbd5e1 !important;
          background: rgba(18, 26, 34, 0.65) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 9999px !important;
          padding: 8px 16px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
        }

        .back-home:hover {
          color: #fbbf24 !important;
          background: rgba(245, 158, 11, 0.15) !important;
          border-color: rgba(245, 158, 11, 0.4) !important;
          transform: translateX(-2px);
        }

        .auth-tag {
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          background: rgba(245, 158, 11, 0.12) !important;
          backdrop-filter: blur(8px) !important;
          color: #fbbf24 !important;
          padding: 6px 12px !important;
          border-radius: 9999px !important;
        }

        .auth-intro h1 {
          color: #ffffff !important;
          text-shadow: 0 3px 20px rgba(0, 0, 0, 0.6);
        }

        .auth-intro h1 span {
          color: #fbbf24 !important;
        }

        .auth-intro p {
          color: #cbd5e1 !important;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
        }

        .travel-note {
          background: rgba(18, 26, 34, 0.72) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 16px !important;
          padding: 14px 18px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
          transition: all 0.25s ease !important;
        }

        .travel-note:hover {
          border-color: rgba(245, 158, 11, 0.35) !important;
          background: rgba(18, 26, 34, 0.85) !important;
        }

        .note-icon {
          background: rgba(245, 158, 11, 0.18) !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          color: #fbbf24 !important;
        }

        .travel-note strong {
          color: #ffffff !important;
        }

        .travel-note small {
          color: #94a3b8 !important;
        }

        .auth-card {
          background: rgba(18, 26, 34, 0.82) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-radius: 24px !important;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 255, 255, 0.08) inset !important;
          transition: all 0.3s ease !important;
        }

        .auth-card:hover {
          border-color: rgba(245, 158, 11, 0.28) !important;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(245, 158, 11, 0.12) inset !important;
        }

        .card-icon {
          background: rgba(245, 158, 11, 0.16) !important;
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          color: #fbbf24 !important;
          border-radius: 14px !important;
        }

        .card-eyebrow {
          color: #f59e0b !important;
        }

        .auth-card h2 {
          color: #ffffff !important;
        }

        .card-description {
          color: #94a3b8 !important;
        }

        .auth-card label {
          color: #cbd5e1 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        .auth-card input {
          background: rgba(11, 17, 22, 0.75) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #f8fafc !important;
          border-radius: 12px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .auth-card input::placeholder {
          color: #64748b !important;
        }

        .auth-card input:focus {
          border-color: #f59e0b !important;
          background: rgba(11, 17, 22, 0.95) !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.22) !important;
          outline: none;
        }

        .show-password {
          color: #fbbf24 !important;
          background: transparent !important;
          font-weight: 600 !important;
          transition: color 0.15s ease !important;
        }

        .show-password:hover {
          color: #f59e0b !important;
        }

        .auth-submit {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
          color: #090d11 !important;
          font-weight: 800 !important;
          border-radius: 12px !important;
          box-shadow: 0 12px 28px rgba(245, 158, 11, 0.3) !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .auth-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 16px 36px rgba(245, 158, 11, 0.42) !important;
        }

        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .auth-error {
          background: rgba(225, 29, 72, 0.14) !important;
          border: 1px solid rgba(225, 29, 72, 0.35) !important;
          color: #fda4af !important;
          border-radius: 10px !important;
        }

        .auth-divider span {
          color: #94a3b8 !important;
          background: rgba(18, 26, 34, 0.9) !important;
        }

        .auth-secondary {
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          color: #f8fafc !important;
          font-weight: 700 !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        .auth-secondary:hover {
          border-color: #f59e0b !important;
          color: #fbbf24 !important;
          background: rgba(245, 158, 11, 0.1) !important;
          transform: translateY(-1px);
        }

        .auth-terms {
          color: #64748b !important;
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page dark-auth-page min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <p className="mt-3 text-sm text-slate-400">Loading sign in...</p>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}