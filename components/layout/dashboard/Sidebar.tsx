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
  Users,
  BadgeCheck,
  Undo2,
  Wallet,
  IndianRupee,
  Package,
  Receipt,
  Film,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type NavItem = { name: string; href: string; icon: LucideIcon };
/** An unlabelled section renders as a plain run of links, with no heading. */
type NavSection = { title?: string; items: NavItem[] };

// --- Navigation Links for Each Role ---
// The admin panel is the only role with enough surface to need grouping: a flat
// list of seventeen links is a wall, and it was that wall that hid Refunds,
// Payouts and Reports among everything else. The groups below are the admin's
// actual jobs — run the operation, manage the people, move the money, keep the
// catalogue, read the numbers.
//
// Every admin screen lives under /dashboard/admin and is reachable from exactly
// one entry here. There is deliberately no link out to a second panel: the old
// "Content & Payments" item pointed at /admin, which rendered a whole second
// dashboard (its own sidebar, own header, own logout) *inside* the first. Those
// four screens are now Services, Advertisements, Enquiries and Payments below.
const adminNavigation: NavSection[] = [
  {
    items: [{ name: "Dashboard", href: "/dashboard/admin", icon: LayoutGrid }],
  },
  {
    title: "Operations",
    items: [
      { name: "Assignments", href: "/dashboard/admin/assignments", icon: ClipboardList },
      { name: "Trips", href: "/dashboard/admin/trips", icon: MapPinned },
      { name: "Guide Calendar", href: "/dashboard/admin/guide-calendar", icon: Calendar },
    ],
  },
  {
    title: "People",
    items: [
      { name: "Guide Verification", href: "/dashboard/admin/guide-approvals", icon: BadgeCheck },
      { name: "Guides", href: "/dashboard/admin/guides", icon: PersonStanding },
      { name: "Tourists", href: "/dashboard/admin/tourists", icon: Users },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Payments", href: "/dashboard/admin/payments", icon: Receipt },
      { name: "Refunds", href: "/dashboard/admin/refunds", icon: Undo2 },
      { name: "Payouts", href: "/dashboard/admin/payouts", icon: Banknote },
    ],
  },
  {
    title: "Content",
    items: [
      { name: "Services", href: "/dashboard/admin/services", icon: Package },
      { name: "Advertisements", href: "/dashboard/admin/advertisements", icon: Film },
      { name: "Enquiries", href: "/dashboard/admin/enquiries", icon: MessageSquare },
    ],
  },
  {
    title: "Insights",
    items: [
      { name: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
      { name: "Reviews", href: "/dashboard/admin/reviews", icon: Star },
      { name: "Activity Log", href: "/dashboard/admin/activity-log", icon: History },
    ],
  },
  {
    items: [{ name: "Notifications", href: "/dashboard/notifications", icon: Bell }],
  },
];

const guideNavigationItems: NavItem[] = [
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
  { name: "My Earnings", href: "/dashboard/guide/earnings", icon: Wallet },
  // Cash the office has recorded as paid to this guide — distinct from Earnings,
  // which is the commission ledger for online bookings.
  { name: "Payment History", href: "/dashboard/guide/payments", icon: Receipt },
  { name: "Rates & Payouts", href: "/dashboard/guide/rates", icon: IndianRupee },
  { name: "My Reviews", href: "/dashboard/guide/reviews", icon: Star },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

const userNavigationItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard/user", icon: LayoutGrid },
  { name: "Find a Guide", href: "/guide-availability", icon: PersonStanding },
  { name: "Book a Certified Guide", href: "/register-tourist", icon: Binoculars },
  { name: "Explore Our packages", href: "/services", icon: PlaneLanding },
  { name: "My Bookings", href: "/dashboard/user/my-bookings", icon: BookOpen },
  { name: "My Trips", href: "/dashboard/user/trips", icon: MapPinned },
  { name: "Write a Review", href: "/dashboard/user/reviews", icon: Star },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
];

// Guide and tourist each have few enough links to read fine as one run, so they
// get a single unlabelled section rather than headings for their own sake.
const roleNavigations: Record<"admin" | "guide" | "user", NavSection[]> = {
  admin: adminNavigation,
  guide: [{ items: guideNavigationItems }],
  user: [{ items: userNavigationItems }],
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
  // A tinted fill, not `bg-white` — the sidebar itself is white, so a white
  // "active" pill was invisible and the edge bar was doing all the work.
  active: "bg-teal-50 text-teal-700 font-bold shadow-sm",
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
  userRole: "admin" | "guide" | "tourist";
}) {
  const pathname = usePathname();
  const { logout } = useAuth();
  // Map 'tourist' role to 'user' navigation
  const sections =
    roleNavigations[userRole === "tourist" ? "user" : userRole] ??
    roleNavigations.user;
  const accent = userRole === "guide" ? GUIDE_ACCENT : DEFAULT_ACCENT;

  // Only the most specific matching link lights up. A plain `startsWith` marks
  // the section root active on every child route too — on /dashboard/guide/
  // buy-subscription both "Dashboard" and "Subscription" would highlight.
  // Resolved across every section at once, so the winner is the longest match
  // in the whole nav rather than the longest within its own group.
  const activeHref = sections
    .flatMap((section) => section.items)
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
      {/* z-60 clears the website's own fixed navbar (z-50); at z-40 the dim
          layer stopped at the navbar's bottom edge, leaving a live, undimmed
          strip across the top of the phone screen while the drawer was open. */}
      <div
        className={`fixed inset-0 bg-black/60 lg:hidden z-60 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* `flex` must be unconditional, not `lg:flex`. Below lg this panel is a
          fixed, full-height drawer whose middle section scrolls (`flex-1
          overflow-y-auto` below) — without display:flex that `flex-1` does
          nothing, the nav grows to its content height, and everything past the
          bottom of the screen is simply unreachable. The admin nav is ~1200px
          tall, so on a phone half of it vanished. z-70 keeps the drawer above
          its own overlay and the site navbar. */}
      <aside
        className={`fixed inset-y-0 left-0 z-70 flex w-[270px] flex-col border-r bg-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        lg:sticky lg:z-30 lg:h-full lg:translate-x-0 lg:shadow-none`}
      >
        {/* The drawer's close control, built from the same 40px rounded-xl box
            as the header's — this panel only ever appears below lg, i.e. on
            exactly the screens where the tap target matters. The offset tracks
            the brand block's height so the box stays centred in it:
            (64-40)/2 = 12px, (72-40)/2 = 16px. Never visible at lg, so there's
            no third step. */}
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="hover:border-primary/30 hover:text-primary absolute top-3 right-4 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/60 text-slate-500 transition-colors sm:top-4 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        {/* `h-16 sm:h-18 lg:h-20` mirrors the dashboard Header exactly, so the
            brand sits on the same line as the page title at every width. Change
            one and you must change the other. The border is only needed below
            lg, where this panel is an overlay drawer (z-70) floating above the
            shell rather than a column standing beside it. */}
        <div className="flex h-16 shrink-0 items-center border-b px-6 sm:h-18 lg:h-20 lg:border-b-0">
          {/* text-xl, not text-2xl: at 24px the wordmark's 32px line box filled
              the block to within 16px of its edges and sat visually flush
              against the rule beneath it. 20px drops the line box to 28px,
              clearing 18px above and below in the 64px block and 22px in the
              72px one — the same air the header's 32px control boxes get, which
              is what puts the brand and the page title on one rhythm. */}
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-slate-900"
          >
            GetMyGuide
          </Link>
        </div>

        {/* `overscroll-contain` keeps a flick at the end of the nav from
            scrolling the page underneath the open drawer. */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-6">
          <nav className="px-4 text-sm font-medium">
            {sections.map((section, sectionIndex) => (
              <div
                key={section.title ?? `section-${sectionIndex}`}
                // Space between groups, but not above the first one — it already
                // has the nav's own top padding.
                className={sectionIndex > 0 ? "mt-6" : ""}
              >
                {section.title && (
                  <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </h2>
                )}
                <div className="grid items-start gap-1.5">
                  {section.items.map((item) => {
                    const isActive = item.href === activeHref;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => handleLinkClick(item.href)}
                        aria-current={isActive ? "page" : undefined}
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
                </div>
              </div>
            ))}
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
