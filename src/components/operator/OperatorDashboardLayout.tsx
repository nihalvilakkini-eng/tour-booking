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
    { label: "Dashboard", href: "/operator/dashboard", icon: LayoutDashboard },
    { label: "Profile", href: "/profile", icon: UserRound },
    { label: "Reviews", href: "/operator/dashboard/reviews", icon: Star },
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
    <div className="operator-dashboard-shell min-h-screen bg-slate-50 text-slate-800 md:flex">
      <aside className="border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-5">
        <Link href="/operator/dashboard" className="flex items-center gap-3 px-2 py-3">
          <span className="rounded-xl bg-teal-600 p-2.5 text-white">
            <Compass size={24} />
          </span>
          <span>
            <span className="block text-xl font-bold">Wayora</span>
            <span className="text-xs text-slate-500">Operator Portal</span>
          </span>
        </Link>

        <p className="mb-3 mt-7 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          Manage business
        </p>

        <nav className="grid grid-cols-2 gap-1 md:block md:space-y-1">
          {links.map(({ label, href, icon: Icon, badge }) => {
            const active =
              pathname === href ||
              (href !== "/" && pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                {badge !== undefined && badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="mt-6 block rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-slate-50"
        >
          ← Back to website
        </Link>
        {logoutError && (
          <p role="alert" className="mt-2 px-3 text-sm text-red-600">
            {logoutError}
          </p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-2 w-full rounded-xl px-3 py-3 text-left text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
