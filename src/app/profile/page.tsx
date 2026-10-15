
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage: string;
  role: string;
};

type Booking = {
  _id: string;
  status?: string;
  participants?: number;
  totalAmount?: number;
  tour?: {
    title?: string;
    destination?: string;
    images?: string[];
  };
  availability?: {
    date?: string;
    startTime?: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (response.status === 401) {
          router.replace("/login?redirect=/profile");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load profile");
        }

        const user: Profile = result.data;

        setProfile(user);
        setName(user.name || "");
        setLastName(user.lastName || "");
        setPhone(user.phone || "");

        const bookingResponse = await fetch("/api/bookings", {
          credentials: "include",
          cache: "no-store",
        });

        if (bookingResponse.ok) {
          const bookingResult = await bookingResponse.json();

          if (bookingResult.success && Array.isArray(bookingResult.data)) {
            setBookings(bookingResult.data);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  function selectImage(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("lastName", lastName.trim());
    formData.append("phone", phone);

    if (image) {
      formData.append("profileImage", image);
    }

    setSaving(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Profile update failed");
      }

      setProfile(result.data);
      setName(result.data.name || "");
      setLastName(result.data.lastName || "");
      setPhone(result.data.phone || "");
      setImage(null);
      setPreview("");
      setEditing(false);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update profile"
      );
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <main className="profile-state">
        <div className="profile-loader" />
        <p>Loading your profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-state">
        <h2>Unable to load profile</h2>
        <p>{error || "Please log in and try again."}</p>
        <button onClick={() => router.push("/login")}>
          Go to Login
        </button>
      </main>
    );
  }

  const avatar = preview || profile.profileImage;

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero-content">
          <span className="profile-eyebrow">YOUR WAYORA ACCOUNT</span>
          <h1>Your Profile</h1>
          <p>Manage your details and keep track of your adventures.</p>
        </div>
      </section>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-avatar">
            {avatar ? (
              <img src={avatar} alt="Profile" />
            ) : (
              <span>
                {profile.name?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>

          <h2>{profile.name} {profile.lastName}</h2>
          <p className="profile-email">{profile.email}</p>
          <span className="profile-role">
            {profile.role || "user"}
          </span>

          <div className="profile-sidebar-divider" />

          <button
            className="profile-menu-button active"
            onClick={() => {
              document
                .getElementById("personal-information")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>01</span> Personal Information
          </button>

          <button
            className="profile-menu-button"
            onClick={() => {
              document
                .getElementById("my-bookings")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span>02</span> My Bookings
          </button>

          <button className="profile-logout" onClick={logout}>
            ↗ Sign Out
          </button>
        </aside>

        <div className="profile-main">
          <section
            className="profile-panel"
            id="personal-information"
          >
            <div className="profile-panel-heading">
              <div>
                <span className="profile-section-label">ACCOUNT</span>
                <h2>Personal Information</h2>
                <p>Your personal details and contact information.</p>
              </div>

              {!editing && (
                <button
                  className="profile-edit-button"
                  onClick={() => {
                    setName(profile.name || "");
                    setLastName(profile.lastName || "");
                    setPhone(profile.phone || "");
                    setImage(null);
                    setPreview("");
                    setEditing(true);
                    setMessage("");
                    setError("");
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {message && <div className="profile-success">{message}</div>}
            {error && <div className="profile-error">{error}</div>}

            {editing ? (
              <form onSubmit={saveProfile} className="profile-form">
                <div className="profile-upload">
                  <div className="profile-upload-avatar">
                    {avatar ? (
                      <img src={avatar} alt="Selected profile" />
                    ) : (
                      <span>{name.charAt(0).toUpperCase() || "U"}</span>
                    )}
                  </div>

                  <div>
                    <strong>Profile Photo</strong>
                    <p>Choose an image under 5MB.</p>
                    <button
                      type="button"
                      className="profile-text-button"
                      onClick={() => fileRef.current?.click()}
                    >
                      Choose Photo
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) =>
                        selectImage(event.target.files?.[0])
                      }
                    />
                  </div>
                </div>

                <div className="profile-fields">
                  <label>
                    First Name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Last Name
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Email Address
                    <input value={profile.email} disabled />
                    <small>Email cannot be changed here.</small>
                  </label>

                  <label>
                    Phone Number
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </label>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={() => {
                      setEditing(false);
                      setImage(null);
                      setPreview("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-save-button"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-fields">
                <div className="profile-field">
                  <span>First Name</span>
                  <strong>{profile.name || "Not provided"}</strong>
                </div>

                <div className="profile-field">
                  <span>Last Name</span>
                  <strong>{profile.lastName || "Not provided"}</strong>
                </div>

                <div className="profile-field">
                  <span>Email Address</span>
                  <strong>{profile.email}</strong>
                </div>

                <div className="profile-field">
                  <span>Phone Number</span>
                  <strong>{profile.phone || "Not provided"}</strong>
                </div>
              </div>
            )}
          </section>

          <section className="profile-panel" id="my-bookings">
            <div className="profile-panel-heading">
              <div>
                <span className="profile-section-label">YOUR JOURNEYS</span>
                <h2>My Bookings</h2>
                <p>Your tour booking requests in one place.</p>
              </div>

              <button
                className="profile-edit-button"
                onClick={() => router.push("/tours")}
              >
                Explore Tours
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="profile-empty">
                <div className="profile-empty-icon">✦</div>
                <h3>No bookings yet</h3>
                <p>Your next adventure could be just around the corner.</p>
                <button
                  className="profile-save-button"
                  onClick={() => router.push("/tours")}
                >
                  Discover Tours
                </button>
              </div>
            ) : (
              <div className="profile-bookings">
                {bookings.map((booking) => (
                  <article className="profile-booking-card" key={booking._id}>
                    {booking.tour?.images?.[0] ? (
                      <img
                        className="profile-booking-image"
                        src={booking.tour.images[0]}
                        alt={booking.tour.title || "Tour"}
                      />
                    ) : (
                      <div className="profile-booking-placeholder">✦</div>
                    )}

                    <div className="profile-booking-info">
                      <h3>{booking.tour?.title || "Tour booking"}</h3>
                      <p>{booking.tour?.destination || "Destination not available"}</p>
                      <p>
                        {booking.availability?.date
                          ? new Date(booking.availability.date).toLocaleDateString()
                          : "Date pending"}
                        {booking.availability?.startTime
                          ? ` · ${booking.availability.startTime}`
                          : ""}
                      </p>
                      <p>Participants: {booking.participants ?? 1}</p>
                    </div>

                    <div className="profile-booking-meta">
                      <strong>
                        {typeof booking.totalAmount === "number"
                          ? `₹${booking.totalAmount.toLocaleString("en-IN")}`
                          : "Amount pending"}
                      </strong>
                      <span
                        className={`profile-booking-status ${(booking.status || "pending").toLowerCase()}`}
                      >
                        {booking.status || "pending"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
