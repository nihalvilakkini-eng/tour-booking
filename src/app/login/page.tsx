"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login failed");
      }

      window.dispatchEvent(new Event("wayora-auth-change"));

      const redirect = searchParams.get("redirect");
      const defaultRedirect =
        result.data?.role === "operator" ? "/operator/dashboard" : "/tours";

      router.push(redirect || defaultRedirect);
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
    <main className="auth-page">
      <div className="auth-background" />

      <Link href="/" className="auth-logo">
        wayora<span>.</span>
      </Link>

      <Link href="/" className="back-home">
        ← Back to home
      </Link>

      <section className="auth-layout">
        <div className="auth-intro">
          <span className="auth-tag">YOUR NEXT ADVENTURE STARTS HERE</span>

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

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <div className="password-heading">
              <label htmlFor="password">Password</label>
            </div>

            <div className="password-box">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
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
    </main>
  );
}
