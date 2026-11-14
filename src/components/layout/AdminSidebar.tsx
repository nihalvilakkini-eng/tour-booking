"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Compass,
  FileText,
  MapPin,
  Calendar,
  CalendarDays,
  Star,
  CreditCard,
  BarChart3,
  Bell,
  MessageSquare,
  House,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
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
        console.error("AdminSidebar unread count error:", err);
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

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      label: "Operator Messages",
      href: "/admin/dashboard/messages",
      icon: MessageSquare,
      badge: unreadMessages,
    },
    { label: "Users", href: "/admin/dashboard/users", icon: Users },
    { label: "Operators", href: "/admin/dashboard/operators", icon: Compass },
    { label: "Applications", href: "/admin/dashboard/operator-applications", icon: FileText },
    { label: "Tours", href: "/admin/dashboard/tours", icon: MapPin },
    { label: "Bookings", href: "/admin/dashboard/bookings", icon: Calendar },
    { label: "Availability", href: "/admin/dashboard/availability", icon: CalendarDays },
    { label: "Reviews", href: "/admin/dashboard/reviews", icon: Star },
    { label: "Payments", href: "/admin/dashboard/payments", icon: CreditCard },
    { label: "Reports", href: "/admin/dashboard/reports", icon: BarChart3 },
    { label: "Notifications", href: "/admin/dashboard/notifications", icon: Bell },
  ];

  return (
    <aside className="w-full shrink-0 border-b border-white/10 bg-[#121a22] p-4 md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
      <Link href="/admin/dashboard" className="flex items-center gap-3 px-2 py-3">
        <span className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-2.5 text-amber-400">
          <Compass size={24} />
        </span>
        <span>
          <span className="block text-xl font-extrabold tracking-tight text-white">
            Wayora
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Admin Console
          </span>
        </span>
      </Link>

      <p className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Administration
      </p>

      <nav className="space-y-1">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/admin/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "border border-amber-500/35 bg-amber-500/15 font-semibold text-amber-300"
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

      <div className="mt-8 border-t border-white/10 pt-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-amber-400"
        >
          <House size={15} />
          Back to Website
        </Link>
      </div>
    </aside>
  );
}