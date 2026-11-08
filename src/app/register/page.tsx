"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BUSINESS_TYPE_OPTIONS = [
  "Travel Agency",
  "Tour Operator",
  "Adventure Activity Provider",
  "Local Tour Guide",
  "Trekking Organizer",
  "Resort / Hotel",
  "Other",
] as const;

export default function RegisterPage() {
  const router = useRouter();

  // Account Type: "traveller" | "operator"
  const [accountType, setAccountType] = useState<"traveller" | "operator">("traveller");

  // Common Registration Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);

  // Operator Application Fields - Business Info
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // Operator Application Fields - Contact Info
  const [businessEmail, setBusinessEmail] = useState("");

  // Operator Application Fields - Location Info
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Operator Application Fields - Additional Info
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("1");
  const [website, setWebsite] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [operatorSubmitted, setOperatorSubmitted] = useState(false);

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Validate Common Fields
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please provide a valid email address.");
      return;
    }

    // Phone number is mandatory for all accounts
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone) {
      setError("Phone number is required.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    // Validate Operator Fields if Operator selected
    if (accountType === "operator") {
      if (!businessName.trim()) {
        setError("Please enter your business / company name.");
        return;
      }

      if (!businessType) {
        setError("Please select a business type.");
        return;
      }

      if (!businessDescription.trim()) {
        setError("Please provide a business description.");
        return;
      }

      if (
        !businessEmail.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())
      ) {
        setError("Please provide a valid business email address.");
        return;
      }

      if (
        !country.trim() ||
        !state.trim() ||
        !city.trim() ||
        !businessAddress.trim()
      ) {
        setError("Please complete all location fields (country, state, city and address).");
        return;
      }

      const yearsNum = Number(yearsOfExperience);
      if (
        yearsOfExperience === "" ||
        Number.isNaN(yearsNum) ||
        yearsNum < 0 ||
        !Number.isInteger(yearsNum)
      ) {
        setError("Years of experience must be a non-negative whole number (0 or more).");
        return;
      }
    }

    if (profileImage && !profileImage.type.startsWith("image/")) {
      setError("Please select a valid image file for profile image.");
      return;
    }

    if (profileImage && profileImage.size > 5 * 1024 * 1024) {
      setError("Profile image size must be less than 5MB.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // Common fields
      formData.append("accountType", accountType);
      formData.append("fullName", fullName.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("phone", cleanPhone);
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      // Operator application fields
      if (accountType === "operator") {
        formData.append("businessName", businessName.trim());
        formData.append("businessType", businessType);
        formData.append("businessDescription", businessDescription.trim());
        formData.append("operatorPhone", cleanPhone);
        formData.append("businessEmail", businessEmail.trim().toLowerCase());
        formData.append("country", country.trim());
        formData.append("state", state.trim());
        formData.append("city", city.trim());
        formData.append("businessAddress", businessAddress.trim());
        formData.append("yearsOfExperience", yearsOfExperience.trim());
        formData.append("website", website.trim());
        formData.append("registrationNumber", registrationNumber.trim());
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

      if (accountType === "operator") {
        setOperatorSubmitted(true);
      } else {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
            {accountType === "operator"
              ? "Partner with WAYORA to offer unforgettable experiences, manage bookings effortlessly, and connect with travellers worldwide."
              : "Create your account and start discovering experiences that make every journey special."}
          </p>

          <div className="travel-note">
            <span className="note-icon">✦</span>
            <div>
              <strong>
                {accountType === "operator"
                  ? "Grow your tourism business"
                  : "Your adventure begins today."}
              </strong>
              <small>
                {accountType === "operator"
                  ? "Verified operator profiles gain access to tour publishing tools."
                  : "Join Wayora and explore the extraordinary."}
              </small>
            </div>
          </div>
        </div>

        <div className="auth-card register-card">
          <div className="card-icon">✦</div>

          <p className="card-eyebrow">
            {accountType === "operator"
              ? "OPERATOR APPLICATION"
              : "START EXPLORING"}
          </p>
          <h2>
            {accountType === "operator"
              ? "Apply as Tour Operator"
              : "Create your account"}
          </h2>
          <p className="card-description">
            {accountType === "operator"
              ? "Submit your business details for admin verification and approval."
              : "Enter your details to get started with Wayora."}
          </p>

          {/* Operator Submission Success State */}
          {operatorSubmitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700">
                ✓
              </div>
              <h3 className="mt-4 text-xl font-bold text-emerald-950">
                Application Submitted!
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                Thank you for applying to become a verified operator on{" "}
                <strong>WAYORA</strong>. Your business application has been
                received and is currently <strong>Pending Admin Review</strong>.
              </p>

              <div className="my-5 rounded-xl border border-emerald-200 bg-white p-4 text-left text-xs text-gray-700">
                <p>
                  <strong>What happens next?</strong>
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-gray-600">
                  <li>Our admin team will review your business credentials.</li>
                  <li>You will receive an in-app notification once approved.</li>
                  <li>
                    Upon approval, your account role will be upgraded to{" "}
                    <span className="font-semibold text-emerald-700">Operator</span> with full dashboard access.
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#087f6e] py-3 text-sm font-bold text-white transition hover:bg-[#066354]"
              >
                Continue to Sign In →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              {/* Account Type Selector */}
              <label>Choose Account Type</label>
              <div className="account-type-grid">
                <button
                  type="button"
                  className={`account-type-btn ${
                    accountType === "traveller" ? "active" : ""
                  }`}
                  onClick={() => {
                    setAccountType("traveller");
                    setError("");
                  }}
                >
                  <span className="account-type-badge">🎒</span>
                  <span className="account-type-title">Traveller</span>
                  <span className="account-type-desc">
                    Book tours and explore experiences
                  </span>
                </button>

                <button
                  type="button"
                  className={`account-type-btn ${
                    accountType === "operator" ? "active" : ""
                  }`}
                  onClick={() => {
                    setAccountType("operator");
                    setError("");
                  }}
                >
                  <span className="account-type-badge">🧭</span>
                  <span className="account-type-title">Operator</span>
                  <span className="account-type-desc">
                    Host tours, treks and activities
                  </span>
                </button>
              </div>

              {/* Common Fields */}
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />

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

              <label htmlFor="registerPhone">Phone Number</label>
              <input
                id="registerPhone"
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

              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-box">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Dynamic Operator Application Form */}
              {accountType === "operator" && (
                <div className="mt-4 space-y-4">
                  {/* Business Information Section */}
                  <fieldset className="operator-fieldset">
                    <legend className="operator-legend">
                      🏢 Business Information
                    </legend>

                    <label htmlFor="businessName">Business / Company Name</label>
                    <input
                      id="businessName"
                      type="text"
                      placeholder="e.g. Himalayan Trail Guides Pvt. Ltd."
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />

                    <label htmlFor="businessType">Business Type</label>
                    <select
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      required
                    >
                      <option value="">Select Business Type...</option>
                      {BUSINESS_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="businessDescription">Business Description</label>
                    <textarea
                      id="businessDescription"
                      rows={3}
                      placeholder="Briefly describe your company, travel specialties, guided tours, and activities..."
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      required
                    />
                  </fieldset>

                  {/* Contact Information Section */}
                  <fieldset className="operator-fieldset">
                    <legend className="operator-legend">
                      📞 Business Contact
                    </legend>

                    <label htmlFor="businessEmail">Business Email</label>
                    <input
                      id="businessEmail"
                      type="email"
                      placeholder="contact@company.com"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      required
                    />
                  </fieldset>

                  {/* Location Information Section */}
                  <fieldset className="operator-fieldset">
                    <legend className="operator-legend">
                      📍 Location Information
                    </legend>

                    <div className="form-three-columns">
                      <div>
                        <label htmlFor="country">Country</label>
                        <input
                          id="country"
                          type="text"
                          placeholder="e.g. India"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="state">State</label>
                        <input
                          id="state"
                          type="text"
                          placeholder="e.g. Himachal Pradesh"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="city">City</label>
                        <input
                          id="city"
                          type="text"
                          placeholder="e.g. Manali"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <label htmlFor="businessAddress">Business Address</label>
                    <input
                      id="businessAddress"
                      type="text"
                      placeholder="Street address, building, or office suite"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      required
                    />
                  </fieldset>

                  {/* Additional Information Section */}
                  <fieldset className="operator-fieldset">
                    <legend className="operator-legend">
                      ✦ Additional Information
                    </legend>

                    <label htmlFor="yearsOfExperience">Years of Experience</label>
                    <input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Years in operation (e.g. 5)"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      required
                    />

                    <div className="form-two-columns">
                      <div>
                        <label htmlFor="website">Website / Social URL (Optional)</label>
                        <input
                          id="website"
                          type="text"
                          placeholder="https://..."
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>

                      <div>
                        <label htmlFor="registrationNumber">
                          Registration Number (Optional)
                        </label>
                        <input
                          id="registrationNumber"
                          type="text"
                          placeholder="e.g. REG-12345"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800">
                    ℹ️ <strong>Note:</strong> Operator accounts require verification by an administrator. Once submitted, your application status will be <em>Pending</em> until approved.
                  </div>
                </div>
              )}

              {/* Profile Image (Optional) */}
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

              {error && <p className="auth-error mt-3">{error}</p>}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? accountType === "operator"
                    ? "Submitting application..."
                    : "Creating account..."
                  : accountType === "operator"
                    ? "Submit Operator Application"
                    : "Create Traveller Account"}
                {!loading && <span>→</span>}
              </button>
            </form>
          )}

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
