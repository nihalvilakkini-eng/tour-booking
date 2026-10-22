
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/operator/dashboard" },
  { label: "My Tours", href: "/operator/dashboard/tours" },
  { label: "Add Tour", href: "/operator/tour/add" },
  { label: "Bookings", href: "/operator/dashboard/bookings" },
  { label: "Availability", href: "/operator/dashboard/availability" },
  { label: "Reviews", href: "/operator/dashboard/reviews" },
];

export default function OperatorHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        window.dispatchEvent(new Event("wayora-auth-change"));
        router.replace("/login");
        router.refresh();
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch {
      alert("Something went wrong while logging out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="operator-header">
      <div className="operator-header-inner">
        <Link
          href="/operator/dashboard"
          className="operator-brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="operator-brand-icon">W</span>
          <span>
            <strong>WAYORA</strong>
            <small>Operator Portal</small>
          </span>
        </Link>

        <button
          type="button"
          className="operator-menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          className={`operator-nav ${menuOpen ? "operator-nav-open" : ""}`}
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/operator/dashboard" &&
                pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`operator-nav-link ${
                  active ? "operator-nav-active" : ""
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            className="operator-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </nav>
      </div>
    </header>
  );
}
