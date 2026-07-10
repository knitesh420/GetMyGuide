"use client";

import { LogOut, Menu, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import { User } from "@/types/auth";
import { usePathname } from "next/navigation";
import {
  useLanguage,
  supportedLanguages,
  LanguageCode,
} from "@/contexts/LanguageContext";
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
  const { t, language, setLanguage } = useLanguage();
  const title = generateTitle(pathname, t);
  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };
  const isGuide = user?.role === "guide";
  // The guide panel is a single-locale workspace — the language switcher only
  // belongs on the traveller-facing and admin shells.
  const showLanguageSelector = !isGuide;

  // h-18 (72px) and px-6 are shared with the Sidebar's brand block, so the logo,
  // this title and the user controls all centre on the same line. The rule below
  // the row is drawn once, by the dashboard layout, spanning both columns — this
  // header deliberately has no `border-b` of its own, or the two would stack.
  return (
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between bg-white dark:bg-slate-900 px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language Selector */}
        {showLanguageSelector && (
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-0 border-none"
            >
              {supportedLanguages.map((lang) => (
                <option key={lang} value={lang} className="text-black">
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Welcome Message */}
        <p className="hidden whitespace-nowrap text-sm text-slate-500 sm:block dark:text-slate-400">
          {t("welcome_back")},{" "}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {getFirstName(user?.name)}
          </span>
        </p>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 h-10"
        >
          <LogOut className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">{t("profile_logout")}</span>
        </Button>
      </div>
    </header>
  );
}