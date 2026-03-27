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
const generateTitle = (
  pathname: string,
  t: (key: string) => string
): string => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return t("dashboard");

  const title = segments[segments.length - 1];
  return title.charAt(0).toUpperCase() + title.slice(1).replace("-", " ");
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
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white dark:bg-slate-900 dark:border-slate-800 px-4 sm:px-8 py-4 md:px-16 shadow-sm">
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

        {/* Welcome Message */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-base text-slate-500 dark:text-slate-400">
            {t("welcome_back")}
          </span>
          <span className="text-base font-semibold text-slate-800 dark:text-slate-200 -mt-0.5">
            {getFirstName(user?.name)}
          </span>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 h-10"
        >
          <LogOut className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">{t("logout")}</span>
        </Button>
      </div>
    </header>
  );
}