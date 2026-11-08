
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Compass,
  CircleUserRound,
  Bell,
} from "lucide-react";

type AuthRole = "admin" | "operator" | "user";

type NavigationLink = {
  label: string;
  href: string;
  icon?: "profile" | "notification";
  badge?: number;
};

const guestLinks: NavigationLink[] = [
  { label: "Home", href: "/" },
  { label: "Explore Tours", href: "/tours" },
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<AuthRole | null | undefined>(
    undefined
  );

  const [hasBooking, setHasBooking] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        if (response.status === 401 || response.status === 404) {
          setRole(null);
          setHasBooking(false);
          setUnreadNotifications(0);
          setUnreadMessages(0);
          return;
        }

        const result = await response.json();

        if (
          response.status === 403 &&
          result.message?.toLowerCase().includes("deactivated")
        ) {
          setRole(null);
          router.push("/login?reason=account-deactivated");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Authentication failed");
        }

        const currentRole = result.data?.role;

        if (
          currentRole !== "admin" &&
          currentRole !== "operator" &&
          currentRole !== "user"
        ) {
          throw new Error("Invalid user role");
        }

        setRole(currentRole);

        if (currentRole === "user") {
          const statusResponse = await fetch(
            "/api/navbar/status",
            {
              credentials: "include",
              cache: "no-store",
            }
          );

          if (!mounted) return;

          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();

            if (statusResult.success) {
              setHasBooking(
                Boolean(statusResult.data?.hasBooking)
              );

              setUnreadNotifications(
                Number(statusResult.data?.unreadNotifications) || 0
              );

              setUnreadMessages(
                Number(statusResult.data?.unreadMessages) || 0
              );
            }
          }
        } else {
          setHasBooking(false);
          setUnreadNotifications(0);
          setUnreadMessages(0);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Navbar authentication error:", error);
      }
    }

    void checkAuthentication();

    function handleAuthChange() {
      void checkAuthentication();
    }

    window.addEventListener(
      "wayora-auth-change",
      handleAuthChange
    );

    window.addEventListener(
      "wayora-booking-change",
      handleAuthChange
    );

    window.addEventListener(
      "wayora-notification-change",
      handleAuthChange
    );

    window.addEventListener(
      "wayora-message-change",
      handleAuthChange
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "wayora-auth-change",
        handleAuthChange
      );

      window.removeEventListener(
        "wayora-booking-change",
        handleAuthChange
      );

      window.removeEventListener(
        "wayora-notification-change",
        handleAuthChange
      );

      window.removeEventListener(
        "wayora-message-change",
        handleAuthChange
      );
    };
  }, [pathname, router]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Logout failed");
      }

      setRole(null);
      setHasBooking(false);
      setUnreadNotifications(0);
      setUnreadMessages(0);
      setMenuOpen(false);

      window.dispatchEvent(new Event("wayora-auth-change"));

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const customerLinks: NavigationLink[] = [
    { label: "Home", href: "/" },
    { label: "Explore Tours", href: "/tours" },

    ...(hasBooking
      ? [
          { label: "My Bookings", href: "/bookings" },
          {
            label: "Messages",
            href: "/messages",
            badge: unreadMessages,
          },
          {
            label: "Notifications",
            href: "/notifications",
            icon: "notification" as const,
            badge: unreadNotifications,
          },
        ]
      : []),

    {
      label: "Profile",
      href: "/profile",
      icon: "profile",
    },
  ];

  const operatorLinks: NavigationLink[] = [
    { label: "Home", href: "/" },
    { label: "Explore Tours", href: "/tours" },
    { label: "Dashboard", href: "/operator/dashboard" },
  ];

  const adminLinks: NavigationLink[] = [
    { label: "Home", href: "/" },
    { label: "Explore Tours", href: "/tours" },
    { label: "Dashboard", href: "/admin/dashboard" },
  ];

  const links =
    role === null
      ? guestLinks
      : role === "user"
        ? customerLinks
        : role === "operator"
          ? operatorLinks
          : role === "admin"
            ? adminLinks
            : [];

  function renderIcon(icon?: NavigationLink["icon"]) {
    if (icon === "profile") {
      return <CircleUserRound size={21} />;
    }

    if (icon === "notification") {
      return <Bell size={21} />;
    }

    return null;
  }

  return (
    <header className="navbar">
      <div className="nav-inner container">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <Compass size={24} />
          </div>

          <span className="text-2xl font-bold tracking-wide text-emerald-900">
            WAYORA
          </span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.icon ? item.label : undefined}
              title={item.icon ? item.label : undefined}
              onClick={() => setMenuOpen(false)}
              className={`nav-item ${
                item.label === "Register" ? "nav-register" : ""
              } ${item.icon ? "nav-icon-only" : ""}`}
            >
              {item.icon ? (
                renderIcon(item.icon)
              ) : (
                <span>{item.label}</span>
              )}

              {item.badge !== undefined && item.badge > 0 && (
                <span className="notification-badge">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}

          {role && (
            <button
              type="button"
              className="nav-register logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </nav>
      </div>

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(251, 252, 250, 0.94);
          border-bottom: 1px solid #e1e8e3;
          box-shadow: 0 4px 18px rgba(23, 45, 37, 0.045);
          backdrop-filter: blur(16px);
        }

        .nav-inner {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 23px;
          font-size: 13px;
          font-weight: 600;
        }

        .nav-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          position: relative;
          white-space: nowrap;
          transition: color 0.18s ease;
        }

        .nav-item:hover {
          color: #087f6e;
        }

        .nav-icon-only {
          justify-content: center;
          padding: 7px;
        }

        .nav-register {
          padding: 11px 17px;
          border-radius: 8px;
          background: #087f6e;
          color: white !important;
        }

        .logout-button {
          border: none;
          cursor: pointer;
          font: inherit;
        }

        .notification-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #e11d48;
          color: white;
          font-size: 10px;
        }

        .menu-toggle {
          display: none;
          padding: 8px 10px;
          border: 1px solid #e1e8e3;
          border-radius: 8px;
          background: transparent;
          font-size: 22px;
        }

        @media (max-width: 900px) {
          .nav-inner {
            min-height: 66px;
          }

          .menu-toggle {
            display: block;
          }

          .nav-links {
            display: none;
            position: absolute;
            top: 66px;
            left: 0;
            right: 0;
            padding: 18px 24px 22px;
            background: #fbfcfa;
            border-bottom: 1px solid #e1e8e3;
            flex-direction: column;
            align-items: stretch;
            gap: 17px;
          }

          .nav-links.nav-open {
            display: flex;
          }

          .nav-item {
            padding: 5px 0;
          }

          .nav-icon-only {
            justify-content: flex-start;
          }

          .nav-register {
            text-align: center;
          }
        }
      `}</style>
    </header>
  );
}
