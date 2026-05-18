"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const { t } = useLanguage();

  const navigationLinks = [
    { key: "nav_home", href: "/" },
    { key: "nav_about", href: "/about" },
    { key: "nav_tours", href: "/services" },
    { key: "nav_find_guides", href: "/find-guides" },
    { key: "nav_become_guide", href: "/guides" },
    { key: "nav_guide_availability", href: "/guide-availability" },
    { key: "nav_contact", href: "/contact" },
  ];

  const tourTypeKeys = [
    "eco_tours",
    "heritage_tours",
    "cooking_classes",
    "spice_market_tours",
    "adventure_tours",
    "photography_tours",
    "cultural_walks",
    "food_tours",
  ];

  const destinationKeys = [
    "india_tours",
    "thailand_tours",
    "vietnam_tours",
    "nepal_tours",
    "sri_lanka_tours",
    "indonesia_tours",
    "malaysia_tours",
    "cambodia_tours",
  ];

  // Data structure ko theek kiya gaya hai taaki har link ka URL ho
  const supportLinks = [
    { key: "help_center", href: "/contact" },
    { key: "safety_guidelines", href: "/safety-guidelines" },
    { key: "privacy_policy", href: "/privacy-policy" },
    { key: "refund_and_cancellation", href: "/refund-and-cancellation" },
    { key: "terms_and_conditions", href: "/terms-and-conditions" },
    { key: "guide_verification", href: "/guides" },
    { key: "customer_support", href: "/contact" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-1 animate-fade-in-up">
              <div className="flex items-center space-x-2 mb-4">
              <div className="relative w-12 h-12 shrink-0">
                <Image
                  src="/images/new_logo.jpeg"
                  alt="GetMyGuide"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold">GetMyGuide</h3>
                <p className="text-sm opacity-80">
                  {t("footer_company_subtitle")}
                </p>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-4 text-balance leading-relaxed">
              {t("footer_company_description")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="animate-fade-in-up animate-delay-200">
            <h4 className="text-lg font-semibold mb-4">
              {t("footer_quick_links")}
            </h4>
            <ul className="space-y-1.5 text-sm">
              {navigationLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="opacity-80 hover:opacity-100 hover:text-secondary transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tour Types */}
          {/* <div className="animate-fade-in-up animate-delay-200">
            <h4 className="text-lg font-semibold mb-4">
              {t("footer_tour_types")}
            </h4>
            <ul className="space-y-1.5 text-sm">
              {tourTypeKeys.map((key) => (
                <li key={key}>
                  <Link
                    href="#"
                    className="opacity-80 hover:opacity-100 hover:text-secondary transition-colors"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          {/* Destinations */}

          {/* Support - YAHAN PAR BADLAAV KIYA GAYA HAI */}
          <div className="animate-fade-in-up animate-delay-600">
            <h4 className="text-lg font-semibold mb-4">
              {t("footer_support")}
            </h4>
            <ul className="space-y-1.5 text-sm">
              {supportLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="opacity-80 hover:opacity-100 hover:text-secondary transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details Section */}
          <div className="space-y-1.5 text-sm">
            <h4 className="text-lg font-semibold mb-3">
              {t("footer_contact_details")}
            </h4>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 opacity-80" />
              <span>9891888444</span>
            </div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 opacity-80" />
              <span>7470222666</span>
            </div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 opacity-80" />
              <span>Contact@getmyguide.in</span>
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2 opacity-80" />
              <span>{t("footer_available_languages")}</span>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        {/* <div className="border-t border-primary-foreground/20 mt-8 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h4 className="text-lg font-semibold mb-1">
                {t("footer_stay_updated")}
              </h4>
              <p className="text-sm opacity-80">
                {t("footer_newsletter_prompt")}
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder={t("footer_email_placeholder")}
                className="flex-1 md:w-64 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {t("footer_subscribe")}
              </Button>
            </div>
          </div>
        </div> */}

        {/* Payment Methods, Social Links & Copyright - All in One Section */}
        <div className="border-t border-primary-foreground/20 mt-6 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Payment Methods */}
            <div className="text-center md:text-left">
              <p className="text-sm opacity-80 mb-2">
                {t("footer_payment_methods") || "Secure Payment Methods"}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <img
                  src="/mastercard.png"
                  alt="Mastercard"
                  className="h-6 w-auto"
                />
                <img src="/visa.png" alt="Visa" className="h-6 w-auto" />
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/getmyguide.in?igsh=NzFzMTQ0MGRnZmRn&utm_source=ig_contact_invite"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.youtube.com/@GETMYGUIDE"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-sm opacity-80 text-center md:text-right">
              <p>{t("footer_copyright")}</p>
              <p className="mt-1">{t("footer_legal_links")}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
