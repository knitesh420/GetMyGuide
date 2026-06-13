import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import { ReduxProvider } from "@/lib/provider";
import ToastProvider from "@/lib/ToastProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AuthInitializer from "@/components/AuthInitializer";
export const metadata: Metadata = {
  title: "GetMyGuide",
  description:
    "Connect with certified local guides for authentic eco tours, heritage walks, cooking classes, and cultural experiences worldwide.",
  generator: "v0.app",
  icons: {
    icon: "/images/new_logo.jpeg",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* LanguageProvider se sab kuch wrap karein */}
        <LanguageProvider>
          <ReduxProvider>
            <AuthInitializer />
            <ToastProvider>
              <Suspense fallback={null}>{children}</Suspense>
              <Analytics />
            </ToastProvider>
          </ReduxProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
