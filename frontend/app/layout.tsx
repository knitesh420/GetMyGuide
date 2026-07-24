import type React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import { ReduxProvider } from "@/lib/provider";
import ToastProvider from "@/lib/ToastProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AuthInitializer from "@/components/AuthInitializer";
import MotionProvider from "@/components/animations/MotionProvider";
import {
  API_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
  cloudinaryResize,
} from "@/lib/seo/config";
import { IMAGES } from "@/lib/images";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | GetMyGuide",
    default: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "travel",
  generator: "v0.app",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: cloudinaryResize(IMAGES.logo, "w_32,h_32,c_fill"), sizes: "32x32" },
      { url: cloudinaryResize(IMAGES.logo, "w_192,h_192,c_fill"), sizes: "192x192" },
    ],
    apple: [
      { url: cloudinaryResize(IMAGES.logo, "w_180,h_180,c_fill"), sizes: "180x180" },
    ],
    shortcut: [cloudinaryResize(IMAGES.logo, "w_32,h_32,c_fill")],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href={API_URL} />
        <link rel="dns-prefetch" href={API_URL} />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* LanguageProvider se sab kuch wrap karein */}
        <LanguageProvider>
          <ReduxProvider>
            <AuthInitializer />
            <ToastProvider>
              <MotionProvider>
                <Suspense fallback={null}>{children}</Suspense>
              </MotionProvider>
              <Analytics />
            </ToastProvider>
          </ReduxProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
