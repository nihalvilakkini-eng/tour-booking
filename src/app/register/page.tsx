"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (profileImage && !profileImage.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (profileImage && profileImage.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone);
      formData.append("password", password);

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }

      // Registration API already creates the login cookie.
      router.push("/login");
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

      <section className="auth-layout register-layout">
        <div className="auth-intro">
          <span className="auth-tag">MAKE THE WORLD YOURS</span>

          <h1>
            More places.
            <br />
            More <span>memories.</span>
          </h1>

          <p>
            Create your account and start discovering experiences
            that make every journey special.
          </p>

          <div className="travel-note">
            <span className="note-icon">✦</span>
            <div>
              <strong>Your adventure begins today.</strong>
              <small>Join Wayora and explore the extraordinary.</small>
            </div>
          </div>
        </div>

        <div className="auth-card register-card">
          <div className="card-icon">✦</div>

          <p className="card-eyebrow">START EXPLORING</p>
          <h2>Create your account</h2>
          <p className="card-description">
            Enter your details to get started.
          </p>

          <form onSubmit={handleRegister}>
            <div className="form-two-columns">
              <div>
                <label htmlFor="name">First name</label>
                <input
                  id="name"
                  placeholder="First name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <label htmlFor="registerEmail">Email address</label>
            <input
              id="registerEmail"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              autoComplete="tel"
              required
            />

            <label htmlFor="registerPassword">Password</label>
            <div className="password-box">
              <input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
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

            <label htmlFor="role">Account type</label>
            <select id="role" value="user" disabled>
              <option value="user">Traveller</option>
            </select>
            <small>Operator access is granted by an administrator.</small>

            <label htmlFor="profileImage">Profile image (optional)</label>
            <input
              id="profileImage"
              className="file-input"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setProfileImage(e.target.files?.[0] || null)
              }
            />

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>

          <p className="auth-terms">
            By continuing, you agree to our terms and privacy policy.
          </p>
        </div>
      </section>
    </main>
  );
}