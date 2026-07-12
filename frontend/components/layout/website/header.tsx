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
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { IMAGES } from "@/lib/images";
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
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, loading, logout } = useAuth();

  // The session lives in an HTTP-only cookie that SSR never reads, so the
  // server always renders the signed-out header. AuthInitializer dispatches
  // validate-auth from a layout above us, which can land mid-hydration — so
  // auth-dependent markup stays server-identical until we're mounted.
  const signedIn = mounted && isAuthenticated === true;
  const busy = mounted && loading;

  const navigationItems = [
    { href: "/", labelKey: "nav_home", icon: Home },
    { href: "/about", labelKey: "nav_about", icon: Info },
    { href: "/services", labelKey: "nav_tours", icon: MapPin },
    { href: "/register-tourist", labelKey: "nav_planned_trip", icon: Users2 },
    { href: "/register-guide", labelKey: "nav_become_guide", icon: Users },
    { href: "/guide-availability", labelKey: "nav_guide_availability", icon: Shield },
    { href: "/how-it-works", labelKey: "nav_how_it_works", icon: HelpCircle },
    { href: "/contact", labelKey: "nav_contact", icon: Mail },
    { href: "/blogs", labelKey: "nav_blog", icon: Mail },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogin = () => router.push("/signin");
  const handleLogout = async () => { await logout(); setIsProfileOpen(false); };
  const handleProfileClick = () => {
    if (user) {
      const dashboardPath =
        user.role === "guide" ? "/dashboard/guide"
        : user.role === "admin" ? "/dashboard/admin"
        : "/dashboard/user";
      router.push(dashboardPath);
      setIsProfileOpen(false);
    }
  };
  const isActive = (href: string) => pathname === href;

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
          scrolled
            ? "bg-white/97 backdrop-blur-xl shadow-md border-b border-gray-100"
            : "bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-sm"
        }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">

            {/* ── Logo ── */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <motion.div
                className="relative w-12 h-12 lg:w-14 lg:h-14 shrink-0"
                whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                transition={{ duration: 0.4 }}
              >
                <Image
                  src={IMAGES.logo}
                  alt="GetMyGuide"
                  fill
                  sizes="(min-width: 1024px) 56px, 48px"
                  className="object-contain rounded-lg"
                  priority
                />
              </motion.div>
              <div className="hidden sm:block leading-tight">
                <motion.p
                  className="text-sm font-extrabold text-primary leading-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  GetMyGuide
                </motion.p>
                <motion.p
                  className="text-[10px] text-gray-400 font-medium"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  getmyguide.in
                </motion.p>
              </div>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5 mx-3 overflow-x-auto scrollbar-hide">
              {navigationItems.map((item, i) => {
                const active = isActive(item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i + 0.15 }}
                  >
                    <Link
                      href={item.href}
                      className={`relative flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap group ${
                        active
                          ? "text-primary bg-primary/8"
                          : "text-gray-600 hover:text-primary hover:bg-primary/5"
                      }`}
                    >
                      {t(item.labelKey)}
                      {/* animated underline */}
                      <span
                        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ${
                          active ? "w-4" : "w-0 group-hover:w-4"
                        }`}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* ── Right actions ── */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Search */}
              <motion.button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-primary border border-gray-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </motion.button>

              {/* Language */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer min-w-[64px]"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                  ))}
                </select>
                <Globe className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <motion.button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all"
                  disabled={busy}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${signedIn ? "bg-primary" : "bg-gray-100"}`}>
                      <User className={`w-3.5 h-3.5 ${signedIn ? "text-white" : "text-gray-600"}`} />
                    </div>
                    {signedIn && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
                    )}
                  </div>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden"
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                    >
                      {!signedIn ? (
                        <>
                          <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-900">{t("profile_welcome")}</p>
                            <p className="text-[11px] text-gray-500">{t("profile_signin_prompt")}</p>
                          </div>
                          <button
                            onClick={handleLogin}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                              <LogIn className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="font-semibold">{t("profile_login")}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="px-4 py-2.5 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                                <p className="text-[11px] text-primary font-semibold capitalize">{user?.role}</p>
                              </div>
                            </div>
                          </div>
                          <button onClick={handleProfileClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Settings className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                            <span className="font-semibold">{t("profile_dashboard")}</span>
                          </button>
                          <div className="mx-4 my-1 h-px bg-gray-100" />
                          <button onClick={handleLogout} disabled={busy} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                            <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                              <LogOut className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <span className="font-semibold">{busy ? t("profile_logging_out") : t("profile_logout")}</span>
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Mobile right buttons ── */}
            <div className="flex lg:hidden items-center gap-1.5">
              <motion.button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600"
                whileTap={{ scale: 0.92 }}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </motion.button>
              <motion.button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg border border-gray-200 text-gray-700"
                whileTap={{ scale: 0.92 }}
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="w-4 h-4" />
                    </motion.span>
                  ) : (
                    <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="lg:hidden border-t border-gray-100 bg-white/98 backdrop-blur-xl"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
                {navigationItems.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive(item.href)
                          ? "text-primary bg-primary/8 font-semibold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${isActive(item.href) ? "text-primary" : "text-gray-400"}`} />
                      {t(item.labelKey)}
                    </Link>
                  </motion.div>
                ))}

                <div className="h-px bg-gray-100 my-3" />

                {/* Mobile language */}
                <div className="relative px-1">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                    ))}
                  </select>
                  <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Mobile auth */}
                {!signedIn ? (
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-primary bg-primary/8 rounded-xl hover:bg-primary/12 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    {t("profile_login")}
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="px-3 py-2 bg-gray-50 rounded-xl">
                      <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button onClick={handleProfileClick} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{t("profile_dashboard")}</span>
                    </button>
                    <button onClick={handleLogout} disabled={busy} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">{busy ? t("profile_logging_out") : t("profile_logout")}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </motion.header>
    </>
  );
}
