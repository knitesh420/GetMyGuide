"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Globe,
  Menu,
  X,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Home,
  Info,
  MapPin,
  Users,
  HelpCircle,
  Mail,
  Settings,
  Users2,
  Search,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useLanguage,
  supportedLanguages,
  LanguageCode,
} from "@/contexts/LanguageContext";
import { SearchModal } from "./SearchModal";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, loading, logout, fetchCurrentUser } =
    useAuth();

  const navigationItems = [
    { href: "/", labelKey: "nav_home", icon: Home },
    { href: "/about", labelKey: "nav_about", icon: Info },
    { href: "/services", labelKey: "nav_tours", icon: MapPin },
    { href: "/register-tourist", labelKey: "nav_find_guides", icon: Users2 },
    { href: "/register-guide", labelKey: "nav_become_guide", icon: Users },
    {
      href: "/guide-availability",
      labelKey: "nav_guide_availability",
      icon: Shield,
    },
    { href: "/how-it-works", labelKey: "nav_how_it_works", icon: HelpCircle },
    { href: "/contact", labelKey: "nav_contact", icon: Mail },
    { href: "/blogs", labelKey: "nav_blog", icon: Mail },
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      fetchCurrentUser();
    }
  }, [isAuthenticated, fetchCurrentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogin = () => router.push("/login");

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
  };

  const handleProfileClick = () => {
    if (user) {
      const dashboardPath =
        user.role === "guide"
          ? "/dashboard/guide"
          : user.role === "admin" || user.role === "manager"
          ? "/admin"
          : "/dashboard/user";
      router.push(dashboardPath);
      setIsProfileOpen(false);
    }
  };

  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-20 h-20 overflow-hidden rounded-xl  p-0.5 transition-transform group-hover:scale-105">
              <div className="w-full h-full rounded-lg overflow-hidden">
                <Image
                  src="/images/logo.png"
                  alt="Book My Tour Guide"
                  fill
                  className="object-contain p-1"
                />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-primary">GetMyGuide</h1>
              <p className="text-xs text-gray-500 font-medium">getmyguide.in</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0 mx-4">
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center px-2.5 py-2.5 rounded-lg font-medium transition-all duration-300 group whitespace-nowrap ${
                    active
                      ? "text-primary bg-primary/10 shadow-sm"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {t(item.labelKey)}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-300 border border-gray-200 text-gray-700 hover:text-primary group"
              aria-label="Search"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-w-[90px] cursor-pointer"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
              <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-300 border border-gray-200 group"
                disabled={loading}
              >
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                      isAuthenticated ? "bg-primary" : "bg-gray-100"
                    }`}
                  >
                    <User
                      className={`w-4 h-4 ${
                        isAuthenticated
                          ? "text-primary-foreground"
                          : "text-gray-600"
                      }`}
                    />
                  </div>
                  {isAuthenticated && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-all duration-300 group-hover:text-gray-700 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white/98 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                  {!isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {t("profile_welcome")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("profile_signin_prompt")}
                        </p>
                      </div>
                      <button
                        onClick={handleLogin}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center">
                          <LogIn className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">
                          {t("profile_login")}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user?.email}
                            </p>
                            <p className="text-xs text-primary font-medium capitalize">
                              {user?.role}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleProfileClick}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-medium">
                          {t("profile_dashboard")}
                        </span>
                      </button>

                      <div className="mx-4 my-2 h-px bg-gray-200" />

                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 disabled:opacity-50"
                      >
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="font-medium">
                          {loading
                            ? t("profile_logging_out")
                            : t("profile_logout")}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="lg:hidden p-2.5 mr-2 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-700" />
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200/50 bg-white/95 backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex flex-col space-y-4">
              <nav className="flex flex-col space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm ${
                      isActive(item.href)
                        ? "text-primary bg-primary/10"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 ${
                        isActive(item.href) ? "text-primary" : "text-gray-500"
                      }`}
                    />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                ))}
              </nav>

              <div className="px-4">
                <div className="w-full h-px bg-gray-200" />
              </div>

              {!isAuthenticated ? (
                <div className="px-2 space-y-2">
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-primary/10 hover:text-primary transition-all duration-200 rounded-lg"
                  >
                    <LogIn className="w-4 h-4 text-primary" />
                    <span>{t("profile_login")}</span>
                  </button>
                </div>
              ) : (
                <div className="px-2 space-y-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 rounded-lg"
                  >
                    <Settings className="w-4 h-4 text-gray-600" />
                    <span>{t("profile_dashboard")}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 rounded-lg"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>
                      {loading ? t("profile_logging_out") : t("profile_logout")}
                    </span>
                  </button>
                </div>
              )}

              <div className="px-4">
                <div className="w-full h-px bg-gray-200" />
              </div>

              <div className="px-4">
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) =>
                      setLanguage(e.target.value as LanguageCode)
                    }
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      </div>
    </header>
  );
}
