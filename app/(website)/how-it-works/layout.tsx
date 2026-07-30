import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";
import { IMAGES } from "@/lib/images";

const TITLE = "How It Works — Booking Guides & Becoming a Guide";
const DESCRIPTION =
  "See how GetMyGuide works for travelers and guides — from searching and booking a certified local guide to applying and earning as a guide.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["how GetMyGuide works", "how to book a guide", "how to become a guide"],
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/how-it-works",
    images: [IMAGES.howItWorkHero || DEFAULT_OG_IMAGE.url],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGES.howItWorkHero || DEFAULT_OG_IMAGE.url],
  },
};

// Mirrors the visible Q&A pairs rendered on the page itself (how_faq_q1..q6 /
// how_faq_a1..a6 in LanguageContext.tsx, English copy) — FAQPage schema must
// match content that's actually visible on the page per Google's guidelines.
const FAQ_ITEMS = [
  { question: "Can I cancel my booking?", answer: "Yes, free cancellation up to 24 hours before the tour." },
  { question: "Are guides verified?", answer: "All guides undergo background checks and certification." },
  { question: "What if I need help during the tour?", answer: "24/7 emergency support is available via phone." },
  { question: "How much can I earn?", answer: "₹500-2000 per hour based on experience and tour type." },
  { question: "When do I get paid?", answer: "Payment is received directly from travelers after tour completion." },
  { question: "Can I set my own schedule?", answer: "Yes, you have full control over your availability." },
];

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQ_ITEMS)} />
      <Breadcrumbs items={[{ name: "How It Works", href: "/how-it-works" }]} />
      {children}
    </>
  );
}
