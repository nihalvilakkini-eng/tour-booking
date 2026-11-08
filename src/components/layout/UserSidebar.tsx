"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Compass,
  CalendarCheck,
  Bell,
  UserRound,
  MessageSquare,
  House,
} from "lucide-react";

export default function UserSidebar() {
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
        console.error("UserSidebar unread count error:", err);
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

  const customerLinks = [
    { label: "My Bookings", href: "/bookings", icon: CalendarCheck },
    {
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      badge: unreadMessages,
    },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Profile", href: "/profile", icon: UserRound },
  ];

  return (
    <aside className="w-full shrink-0 border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-64 md:p-5">
      <Link href="/" className="flex items-center gap-3 px-2 py-3">
        <span className="rounded-xl bg-teal-700 p-2.5 text-white">
          <Compass size={24} />
        </span>
        <span>
          <span className="block text-xl font-bold text-slate-900">Wayora</span>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Traveller Hub
          </span>
        </span>
      </Link>

      <p className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        Account & Trips
      </p>

      <nav className="space-y-1">
        {customerLinks.map(({ label, href, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-teal-50 text-teal-800 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={active ? "text-teal-700" : "text-slate-400"} />
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

      <div className="mt-8 border-t border-slate-100 pt-4">
        <Link
          href="/tours"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <House size={15} />
          Explore Tours
        </Link>
      </div>
    </aside>
  );
}
