import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Terms & Conditions";
const DESCRIPTION =
  "Read the terms and conditions governing the use of GetMyGuide's platform, bookings, and guide services.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["terms and conditions", "terms of service GetMyGuide"],
  alternates: { canonical: "/terms-and-conditions" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/terms-and-conditions",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Terms & Conditions", href: "/terms-and-conditions" }]} />
      {children}
    </>
  );
}
