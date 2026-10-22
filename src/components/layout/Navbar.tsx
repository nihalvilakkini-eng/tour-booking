
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Compass, CircleUserRound } from "lucide-react";

type AuthRole = "admin" | "operator" | "user";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<AuthRole | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let latestRequest = 0;

    async function checkAuthentication() {
      const requestId = ++latestRequest;

      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted || requestId !== latestRequest) return;

        if (response.status === 401 || response.status === 404) {
          setRole(null);
          return;
        }

        const result: {
          success?: boolean;
          message?: string;
          data?: { role?: string };
        } =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || `Profile request failed (${response.status})`
          );
        }

        if (
          result.data?.role !== "admin" &&
          result.data?.role !== "operator" &&
          result.data?.role !== "user"
        ) {
          throw new Error("Profile response did not include a valid account role.");
        }

        setRole(result.data.role);
      } catch (error) {
        if (!mounted || requestId !== latestRequest) return;

        console.error("Unable to verify Navbar authentication:", error);
      }
    }

    function handleAuthenticationChange() {
      setRole(undefined);
      void checkAuthentication();
    }

    void checkAuthentication();
    window.addEventListener(
      "wayora-auth-change",
      handleAuthenticationChange
    );

    return () => {
      mounted = false;
      window.removeEventListener(
        "wayora-auth-change",
        handleAuthenticationChange
      );
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const result: { success?: boolean; message?: string } =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Logout failed");
      }

      setRole(null);
      setMenuOpen(false);
      window.dispatchEvent(new Event("wayora-auth-change"));
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Navbar logout failed:", error);
    }
  }

  return (
    <header className="navbar">
      <div className="nav-inner container">
       <Link href="/" className="flex items-center gap-2">
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
          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/tours" onClick={() => setMenuOpen(false)}>
            Explore Tours
          </Link>
          <Link href="/bookings" onClick={() => setMenuOpen(false)}>
            My Bookings
          </Link>
          {role ? (
            <>
              {(role === "admin" || role === "operator") && (
                <Link
                  href={
                    role === "admin"
                      ? "/admin/dashboard"
                      : "/operator/dashboard"
                  }
                  className="nav-register"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/profile"
                aria-label="My Profile"
                title="My Profile"
                onClick={() => setMenuOpen(false)}
              >
                <CircleUserRound size={25} />
              </Link>

              <button
                type="button"
                className="nav-register"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : role === null ? (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>

              <Link
                href="/register"
                className="nav-register"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </>
          ) : null}
        </nav>
      </div>

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e5ebe7;
          backdrop-filter: blur(12px);
        }

        .nav-inner {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          font-size: 25px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .brand-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          margin-right: 9px;
          border-radius: 11px;
          background: #087f6e;
          color: white;
        }

        .brand-dot {
          color: #087f6e;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          font-size: 14px;
          font-weight: 600;
        }

        .nav-links a:hover {
          color: #087f6e;
        }

        .nav-register {
          padding: 12px 18px;
          border-radius: 9px;
          background: #087f6e;
          color: white !important;
        }

        .menu-toggle {
          display: none;
          border: 0;
          background: transparent;
          font-size: 25px;
        }

        @media (max-width: 760px) {
          .nav-inner {
            min-height: 68px;
          }

          .menu-toggle {
            display: block;
          }

          .nav-links {
            display: none;
            position: absolute;
            top: 68px;
            left: 0;
            right: 0;
            padding: 20px;
            background: white;
            border-bottom: 1px solid #e5ebe7;
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }

          .nav-links.nav-open {
            display: flex;
          }

          .nav-register {
            text-align: center;
          }
        }
      `}</style>
    </header>
  );
}
