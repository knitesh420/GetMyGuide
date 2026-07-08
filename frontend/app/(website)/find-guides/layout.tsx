import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Find a Local Guide — Search Certified Guides Near You";
const DESCRIPTION =
  "Search and filter certified local guides by destination, language, and specialization. Book a verified guide for your next trip with GetMyGuide.";

export const metadata: Metadata = {
  // Re-declaring `template` here (not just a plain string) keeps the parent's
  // "%s | GetMyGuide" suffixing alive for find-guides/[id]/book's generated
  // titles — otherwise this segment's own title would reset the chain for
  // its children.
  title: { template: "%s | GetMyGuide", default: TITLE },
  description: DESCRIPTION,
  keywords: ["find local guide", "certified tour guides", "guide listing India", "book a guide"],
  alternates: { canonical: "/find-guides" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/find-guides",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// No visible breadcrumbs here: this layout also wraps find-guides/[id]/book,
// which renders its own, more specific breadcrumb trail — rendering one here
// too would duplicate it on that page.
export default function FindGuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
