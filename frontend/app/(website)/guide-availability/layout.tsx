import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Guide Availability — Check Open Dates";
const DESCRIPTION =
  "Check real-time availability for certified local guides on GetMyGuide before booking your tour.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["guide availability", "check guide schedule", "book available guide"],
  alternates: { canonical: "/guide-availability" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/guide-availability",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function GuideAvailabilityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Guide Availability", href: "/guide-availability" }]} />
      {children}
    </>
  );
}
