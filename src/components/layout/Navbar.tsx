"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Compass,
  CircleUserRound,
  Bell,
  MessageSquare,
} from "lucide-react";

type AuthRole = "admin" | "operator" | "user";

type NavigationLink = {
  label: string;
  href: string;
  icon?: "profile" | "notification" | "message";
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
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("wayora_token") || localStorage.getItem("token")
            : null;

        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch("/api/auth/profile", {
          headers,
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

        const result = await response.json().catch(() => null);

        if (
          response.status === 403 &&
          result?.message?.toLowerCase().includes("deactivated")
        ) {
          setRole(null);
          router.push("/login?reason=account-deactivated");
          return;
        }

        if (!response.ok || !result?.success) {
          setRole(null);
          setHasBooking(false);
          setUnreadNotifications(0);
          setUnreadMessages(0);
          return;
        }

        const currentRole = result.data?.role;

        if (
          currentRole !== "admin" &&
          currentRole !== "operator" &&
          currentRole !== "user"
        ) {
          setRole(null);
          setHasBooking(false);
          setUnreadNotifications(0);
          setUnreadMessages(0);
          return;
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
            const statusResult = await statusResponse.json().catch(() => null);

            if (statusResult?.success) {
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
      } catch {
        if (!mounted) return;
        setRole(null);
        setHasBooking(false);
        setUnreadNotifications(0);
        setUnreadMessages(0);
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

      if (typeof window !== "undefined") {
        localStorage.removeItem("wayora_token");
        localStorage.removeItem("token");
      }

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
            icon: "message" as const,
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

    if (icon === "message") {
      return <MessageSquare size={21} />;
    }

    return null;
  }

  return (
    <header className="navbar">
      <div className="nav-inner container">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setMenuOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Compass size={24} />
          </div>

          <span className="text-2xl font-bold tracking-widest text-white">
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
              } ${item.icon ? "nav-icon-only" : ""} ${
                pathname === item.href && item.label !== "Register"
                  ? "nav-active"
                  : ""
              }`}
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
          background: rgba(11, 17, 22, 0.88);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(18px);
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
          color: #cbd5e1;
        }

        .nav-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          position: relative;
          white-space: nowrap;
          transition: color 0.18s ease;
        }

        .nav-item:hover,
        .nav-active {
          color: #fbbf24;
        }

        .nav-icon-only {
          justify-content: center;
          padding: 7px;
          border-radius: 10px;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .nav-icon-only:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .nav-register {
          padding: 10px 18px;
          border-radius: 10px;
          background: #f59e0b;
          color: #090d11 !important;
          font-weight: 700;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .nav-register:hover {
          background: #fbbf24;
        }

        .logout-button {
          border: none;
          cursor: pointer;
          font: inherit;
          font-weight: 700;
        }

        .notification-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #f59e0b;
          color: #090d11;
          font-weight: 800;
          font-size: 10px;
        }

        .menu-toggle {
          display: none;
          padding: 8px 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          font-size: 20px;
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
            background: #0f171e;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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