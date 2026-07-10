// components/Sidebar.tsx (assuming this is the location)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  LogOut,
  UserCircle,
  BookOpen,
  X,
  Banknote,
  Calendar,
  Bus,
  PersonStanding,
  PlaneLanding,
  Binoculars,
  ClipboardList,
  MapPinned,
  Star,
  Bell,
  BarChart3,
  History,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

// --- Navigation Links for Each Role ---
const adminNavigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutGrid },
  { name: "Travel Ops Dashboard", href: "/dashboard/admin", icon: LayoutGrid },
  { name: "Assignments", href: "/dashboard/admin/assignments", icon: ClipboardList },
  { name: "Guide Calendar", href: "/dashboard/admin/guide-calendar", icon: Calendar },
  { name: "Trips", href: "/dashboard/admin/trips", icon: MapPinned },
  { name: "Reviews", href: "/dashboard/admin/reviews", icon: Star },
  { name: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  { name: "Activity Log", href: "/dashboard/admin/activity-log", icon: History },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

const guideNavigation = [
  { name: "Dashboard", href: "/dashboard/guide", icon: LayoutGrid },
  { name: "Edit Profile", href: "/dashboard/guide/profile", icon: UserCircle },
  {
    name: "Tour Guide Booking",
    href: "/dashboard/guide/tourguide-booking",
    icon: Bus,
  },
  // --- YEH LINE THEEK KI GAYI HAI ---
  {
    name: "All Service Bookings",
    href: "/dashboard/guide/all-bookings",
    icon: BookOpen,
  },
  {
    name: "Set Availability",
    href: "/dashboard/guide/availability",
    icon: Calendar,
  },
  {
    name: "Subscription",
    href: "/dashboard/guide/buy-subscription",
    icon: Banknote,
  },
  {
    name: "Assignment Requests",
    href: "/dashboard/guide/assignments",
    icon: ClipboardList,
  },
  { name: "My Trips", href: "/dashboard/guide/trips", icon: MapPinned },
  { name: "My Reviews", href: "/dashboard/guide/reviews", icon: Star },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

const userNavigation = [
  { name: "Dashboard", href: "/dashboard/user", icon: LayoutGrid },
  { name: "Find a Guide", href: "/guide-availability", icon: PersonStanding },
  { name: "Planned Trip", href: "/register-tourist", icon: Binoculars },
  { name: "Explore Our packages", href: "/services", icon: PlaneLanding },
  { name: "My Bookings", href: "/dashboard/user/my-bookings", icon: BookOpen },
  { name: "My Trips", href: "/dashboard/user/trips", icon: MapPinned },
  { name: "Write a Review", href: "/dashboard/user/reviews", icon: Star },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

// Role to navigation mapping
const roleNavigations = {
  admin: adminNavigation,
  guide: guideNavigation,
  user: userNavigation,
  manager: adminNavigation,
};

// The guide dashboard is themed green (see `.guide-theme` in globals.css). The
// sidebar renders outside that subtree, so its accent is selected by role here
// rather than inherited. Every other role keeps the existing teal.
const GUIDE_ACCENT = {
  active: "bg-green-50 text-green-700 font-bold shadow-sm",
  idle: "text-slate-600 hover:bg-green-500/10 hover:text-green-700",
  /** No edge bar — the pale green fill alone marks the active guide item. */
  bar: "",
  icon: "text-green-600",
};

const DEFAULT_ACCENT = {
  active: "bg-white text-teal-600 font-bold shadow-sm",
  idle: "text-slate-600 hover:bg-teal-500/10 hover:text-teal-600",
  bar: "bg-teal-500",
  icon: "text-teal-500",
};

export default function Sidebar({
  isOpen,
  onClose,
  userRole,
}: {
  isOpen?: boolean;
  onClose?: () => void;
  userRole: "admin" | "guide" | "user" | "manager" | "tourist";
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  // Map 'tourist' role to 'user' navigation
  const navigation =
    roleNavigations[userRole === "tourist" ? "user" : userRole] ||
    userNavigation;
  const accent = userRole === "guide" ? GUIDE_ACCENT : DEFAULT_ACCENT;

  // Only the most specific matching link lights up. A plain `startsWith` marks
  // the section root active on every child route too — on /dashboard/guide/
  // buy-subscription both "Dashboard" and "Subscription" would highlight.
  const activeHref = navigation
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const handleLinkClick = (href: string) => {
    if (href === "/logout") {
      logout();
    }
    if (window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 lg:hidden z-40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[270px] flex-col border-r bg-white 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        lg:sticky lg:z-30 lg:h-full lg:translate-x-0 lg:flex lg:shadow-none`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-500 hover:text-slate-800 lg:hidden"
        >
          <X className="h-6 w-6" />
        </button>

        {/* h-18 (72px) and px-6 match the dashboard Header, so the brand sits on
            the same line as the page title and the accent rule the layout draws
            across both columns lands on this block's bottom edge. The border is
            only needed below lg, where this panel floats above the rule (z-50)
            rather than sitting flush under it. */}
        <div className="flex h-18 shrink-0 items-center border-b px-6 lg:border-b-0">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight text-slate-900"
          >
            GetMyGuide
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <nav className="grid items-start gap-1.5 px-4 text-sm font-medium">
            {navigation.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => handleLinkClick(item.href)}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                    ${isActive ? accent.active : accent.idle}`}
                >
                  {isActive && accent.bar && (
                    <div
                      className={`absolute left-0 h-7 w-1 rounded-r-full ${accent.bar}`}
                    />
                  )}
                  <item.icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive ? accent.icon : ""
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t p-4">
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
