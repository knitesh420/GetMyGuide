import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/website/header";
import { ConditionalFooter } from "@/components/layout/website/ConditionalFooter";
import Script from "next/script";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";
import FloatingVideoAd from "@/components/FloatingVideoAd";
import { JsonLd } from "@/components/seo/JsonLd";
import PageTransition from "@/components/animations/PageTransition";
import { organizationSchema, websiteSchema } from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo/config";
// import { CartProvider } from "@/contexts/CardContext";

// This is also, in effect, the Home page's own metadata: home's page.tsx
// (app/(website)/page.tsx) has no metadata/layout of its own, and every
// other page under (website) overrides this via its own layout.tsx.
export const metadata: Metadata = {
  // Setting `title` here (rather than leaving it to the root layout) resets
  // template inheritance for every nested page unless we redefine `template`
  // too. `absolute` gives the home page itself the complete, un-suffixed
  // title; `template` re-establishes "%s | GetMyGuide" for every other page
  // under (website) (about, contact, blogs/[id], tours/[id], etc.).
  title: {
    template: "%s | GetMyGuide",
    absolute: "GetMyGuide — Certified Local Guides & Authentic Tours in India",
  },
  description:
    "Connect with certified local guides for authentic eco tours, heritage walks, cooking classes, and cultural experiences across India. Search guides, browse tour packages, and book with confidence.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "GetMyGuide — Certified Local Guides & Authentic Tours in India",
    description:
      "Connect with certified local guides for authentic eco tours, heritage walks, cooking classes, and cultural experiences across India.",
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetMyGuide — Certified Local Guides & Authentic Tours in India",
    description:
      "Connect with certified local guides for authentic eco tours, heritage walks, cooking classes, and cultural experiences across India.",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <Header />
      <div className="pt-14 lg:pt-16">
        <Suspense fallback={null}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </div>
      <ConditionalFooter />
      <FloatingVideoAd />
      <WhatsAppFloatingButton
        phoneNumber="917470222666"
        message="Hi, I want to know more about GetMyGuide."
      />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
    </>
  );
}
