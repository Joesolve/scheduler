"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/new-event",   label: "New Event",     icon: "➕", roles: ["admin"] },
  { href: "/admin/manage",      label: "Manage Events", icon: "🔍", roles: ["admin"] },
  { href: "/admin/calendar",    label: "Calendar",      icon: "📅", roles: ["admin"] },
  { href: "/admin/mark-dates",  label: "Mark Dates",    icon: "🚫", roles: ["admin"] },
  { href: "/admin/settings",    label: "Settings",      icon: "⚙️", roles: ["admin"] },
  { href: "/trainer",           label: "My Calendar",   icon: "📅", roles: ["trainer"] },
  { href: "/viewer",            label: "Calendar",      icon: "📅", roles: ["view_only"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;

  const navItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-navy flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗓️</span>
            <span className="font-display text-white text-xl">EQS</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Event Scheduling</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-orange text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-slate-500 mb-1 truncate">
            {session?.user?.email}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange capitalize">
              {role?.replace("_", " ")}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Logout →
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
