
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CurrentUser = {
  name?: string;
  role?: string;
};

export default function Header() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user ?? data.profile ?? null);
      } catch {
        setUser(null);
      }
    }

    void loadProfile();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#087f6e] text-xl text-white">
            ◉
          </span>
          <span className="text-2xl font-extrabold tracking-wide text-[#066354]">
            WAYORA
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold">
          <Link href="/" className="text-gray-600 hover:text-[#087f6e]">
            Home
          </Link>

          <Link href="/tours" className="text-gray-600 hover:text-[#087f6e]">
            Explore Tours
          </Link>

          {user?.role === "admin" && (
            <Link
              href="/admin/dashboard"
              className="rounded-lg bg-[#e8f5f1] px-3 py-2 text-[#087f6e]"
            >
              Admin Dashboard
            </Link>
          )}

          {user?.role === "operator" && (
            <Link
              href="/operator"
              className="rounded-lg bg-[#e8f5f1] px-3 py-2 text-[#087f6e]"
            >
              Operator Dashboard
            </Link>
          )}

          {user ? (
            <>
              <Link
                href="/profile"
                className="text-gray-600 hover:text-[#087f6e]"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-[#087f6e] px-4 py-2 text-white hover:bg-[#066354]"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-600 hover:text-[#087f6e]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[#087f6e] px-4 py-2 text-white hover:bg-[#066354]"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
