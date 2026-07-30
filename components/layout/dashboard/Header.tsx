"use client";

import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "@/types/auth";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
const humanise = (segment: string) =>
  segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll("-", " ");

const generateTitle = (
  pathname: string,
  t: (key: string) => string
): string => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return t("profile_dashboard");

  // A section root (/dashboard/guide) reads as "Guide Dashboard" rather than a
  // bare "Guide"; deeper routes keep their own page name.
  if (segments.length === 2 && segments[0] === "dashboard") {
    return `${humanise(segments[1])} ${t("profile_dashboard")}`;
  }

  return humanise(segments[segments.length - 1]);
};

export default function Header({
  onMenuClick,
  user,
}: {
  onMenuClick?: () => void;
  user: User | null;
}) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();
  const title = generateTitle(pathname, t);
  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };

  // The bar scales with the viewport rather than sitting at a flat 72px — 64px
  // on phones, 72px on tablets, 80px from lg — so the 40px control boxes clear
  // 12px / 16px / 20px above and below. Desktop gets the most air because it has
  // the most room to give; a phone can't spend 20px on chrome.
  //
  // `shrink-0` is what makes those heights actually hold, and it is not
  // optional. This header is a flex child of the shell's scrolling column
  // (`flex flex-1 flex-col overflow-y-auto` in app/(website)/dashboard/
  // layout.tsx), whose other child is `<main class="flex-1">`. A flex item's
  // automatic minimum size is its content, so on any page taller than the
  // viewport <main> is frozen at its content height, the line's free space goes
  // negative, and the only item left able to absorb it is this one — the bar
  // collapsed from 64/72/80px down to the height of its tallest child. That is
  // why the header looked one height on a short tab (Dashboard) and another on
  // a long one (Bookings, Trips, any admin table): the difference was the page
  // content, not the header. The Sidebar's brand block has always carried
  // `shrink-0` for the same reason; this bar was the one that didn't.
  //
  // The Sidebar's brand block also carries the same `h-16 sm:h-18 lg:h-20`. The
  // two must be changed together or the logo drifts off this title's baseline at
  // desktop, which is the only width where both are visible (below lg the
  // sidebar is an overlay drawer).
  //
  // Horizontal padding steps up to 32px at lg so the logout button has real
  // margin against the window edge instead of the 24px it shared with the
  // phone layout. The header-level `gap` guarantees the title can never close
  // up against the user controls, whatever the route name. No `border-b`:
  // `shadow-sm` does the separating.
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 bg-white px-4 shadow-sm sm:h-18 sm:gap-4 sm:px-6 lg:h-20 lg:gap-6 lg:px-8 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {/* The website navbar's search / menu button, matched in shape
            (components/layout/website/header.tsx): rounded-xl, hairline grey
            border, translucent white fill, accent on hover — at 40px rather
            than that bar's 32px, because this one is a primary navigation
            control on a phone and 40px is the tap target the rest of the
            dashboard already standardises on (the `.dashboard-main` rules in
            globals.css set exactly that min-height/min-width below lg; the
            header sits outside that scope, so it states the size itself).
            Every control in this bar is the same 40px box. */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Open navigation menu"
          className="hover:text-primary hover:border-primary/30 hover:bg-primary/5 h-10 w-10 shrink-0 rounded-xl border-gray-200 bg-white/60 text-gray-600 lg:hidden dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4 shrink-0" />
        </Button>
        {/* `flex-1 min-w-0` makes this side the one that gives: a long
            deep-route title truncates instead of shoving the user controls
            off-screen or wrapping the bar onto a second line. Leading is left
            at the default (28px at both text-lg and text-xl) so the line box —
            and therefore the vertical centring — is identical at every width. */}
        <h1 className="min-w-0 truncate text-lg font-extrabold text-slate-800 sm:text-xl dark:text-slate-100">
          {title}
        </h1>
      </div>
      {/* `shrink-0` pins the controls at their natural width so nothing here
          reflows as the title changes length from route to route. */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {/* Welcome Message. Capped and truncating: an unusually long first name
            would otherwise eat the width the title needs, which is a layout
            shift caused by *who is logged in* rather than by the page. */}
        <p className="hidden max-w-44 truncate text-sm text-slate-500 sm:block lg:max-w-72 dark:text-slate-400">
          {t("welcome_back")},{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {getFirstName(user?.name)}
          </span>
        </p>

        {/* Same 40px rounded-xl box as the menu button opposite it, so the two
            ends of the bar are built from one shape — in red rather than the
            neutral grey, since this is the only destructive control on screen.
            `min-w-10` keeps it a square 40px target on phones, where the label
            is hidden and only the icon remains; the explicit `has-[>svg]:px-*`
            pair overrides the tighter padding shadcn's `sm` size applies to
            icon-bearing buttons, so the horizontal padding matches the menu
            button's at every width. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="h-10 min-w-10 gap-2 rounded-xl border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 has-[>svg]:px-3 sm:px-4 sm:has-[>svg]:px-4 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden whitespace-nowrap sm:inline">
            {t("profile_logout")}
          </span>
        </Button>
      </div>
    </header>
  );
}