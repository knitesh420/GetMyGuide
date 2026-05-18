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
  TramFront,
  PersonStanding,
  PlaneLanding,
  Binoculars,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

// --- Navigation Links for Each Role ---
const adminNavigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutGrid },
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
];

const userNavigation = [
  { name: "Dashboard", href: "/dashboard/user", icon: LayoutGrid },
  { name: "Find a Guide", href: "/find-guides", icon: PersonStanding },
  { name: "Explore Our packages", href: "/services", icon: PlaneLanding },
  {
    name: "Plan Your Tour",
    href: "/dashboard/user/custom-tour",
    icon: Binoculars,
  },
  {
    name: "Your Planned Tours",
    href: "/dashboard/user/planned-tours",
    icon: TramFront,
  },
  {
    name: "Tour Guide Booking",
    href: "/dashboard/user/tour-guide-booking",
    icon: BookOpen,
  },
  { name: "My Bookings", href: "/dashboard/user/my-bookings", icon: BookOpen },
];

// Role to navigation mapping
const roleNavigations = {
  admin: adminNavigation,
  guide: guideNavigation,
  user: userNavigation,
  manager: adminNavigation,
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
        lg:sticky lg:h-screen lg:translate-x-0 lg:flex lg:shadow-none`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-500 hover:text-slate-800 lg:hidden"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center gap-2 border-b px-4 py-5">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight text-slate-900"
          >
            GetMyGuide
          </Link>
          <div className="h-1 w-3/4 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500" />
        </div>

        <div className="flex-1 overflow-y-auto py-8">
          <nav className="grid items-start gap-3 px-6 text-base font-medium">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => handleLinkClick(item.href)}
                  className={`relative flex items-center gap-4 rounded-xl px-3 py-3 transition-all duration-200 
                    ${
                      isActive
                        ? "bg-white text-teal-600 font-bold shadow-sm"
                        : "text-slate-600 hover:bg-teal-500/10 hover:text-teal-600"
                    }`}
                >
                  {isActive && (
                    <div className="absolute left-0 h-8 w-1 rounded-r-full bg-teal-500" />
                  )}
                  <item.icon
                    className={`h-6 w-6 transition-colors ${
                      isActive ? "text-teal-500" : ""
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
            className="flex items-center gap-4 rounded-xl px-3 py-3 text-red-600 transition-all hover:bg-red-100"
          >
            <LogOut className="h-6 w-6" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
