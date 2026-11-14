"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  CalendarCheck,
  Star,
  Bell,
  Compass,
  House,
  UserRound,
  MessageSquare,
} from "lucide-react";

export default function OperatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchUnread() {
      try {
        const res = await fetch("/api/conversations/unread-count", {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.success) {
            setUnreadMessages(data.unreadCount || 0);
          }
        }
      } catch (err) {
        console.error("Operator unread count error:", err);
      }
    }

    void fetchUnread();

    const handleMessageChange = () => {
      void fetchUnread();
    };

    window.addEventListener("wayora-message-change", handleMessageChange);
    return () => {
      mounted = false;
      window.removeEventListener("wayora-message-change", handleMessageChange);
    };
  }, []);

  const links = [
    { label: "Home", href: "/", icon: House },
    { label: "Dashboard", href: "/operator/dashboard", icon: LayoutDashboard },
    { label: "My Tours", href: "/operator/dashboard/tours", icon: Map },
    { label: "Booking Management", href: "/operator/dashboard/bookings", icon: CalendarCheck },
    { label: "Availability Management", href: "/operator/dashboard/availability", icon: CalendarDays },
    {
      label: "Messages",
      href: "/operator/dashboard/messages",
      icon: MessageSquare,
      badge: unreadMessages,
    },
    { label: "Notifications", href: "/operator/dashboard/notifications", icon: Bell },
    { label: "Reviews", href: "/operator/dashboard/reviews", icon: Star },
    { label: "Profile", href: "/profile", icon: UserRound },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const result: { success?: boolean; message?: string } =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Logout failed.");
      }

      window.dispatchEvent(new Event("wayora-auth-change"));
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="operator-dashboard-shell min-h-screen bg-slate-900 text-slate-100 md:flex">
      <aside className="border-b border-white/10 bg-[#121a22] p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
        <Link href="/operator/dashboard" className="flex items-center gap-3 px-2 py-3">
          <span className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-2.5 text-amber-400">
            <Compass size={24} />
          </span>
          <span>
            <span className="block text-xl font-extrabold tracking-tight text-white">Wayora</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Operator Portal
            </span>
          </span>
        </Link>

        <p className="mb-3 mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Manage business
        </p>

        <nav className="grid grid-cols-2 gap-1 md:block md:space-y-1">
          {links.map(({ label, href, icon: Icon, badge }) => {
            const active =
              pathname === href ||
              (href !== "/" && href !== "/operator/dashboard" && pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "border border-amber-500/35 bg-amber-500/15 text-amber-300"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={active ? "text-amber-400" : "text-slate-500"}
                  />
                  <span>{label}</span>
                </div>
                {badge !== undefined && badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-extrabold text-slate-950">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-4">
          <Link
            href="/"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-amber-400"
          >
            ← Back to website
          </Link>
          {logoutError && (
            <p role="alert" className="mt-2 px-3 text-xs text-rose-400">
              {logoutError}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-400 transition hover:bg-rose-500/15 disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Sign Out"}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[#0b1116] p-4 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}