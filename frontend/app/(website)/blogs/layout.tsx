import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Travel Blog — Stories, Tips & Guides";
const DESCRIPTION =
  "Watch travel stories, destination guides, and tips from certified local guides across India on the GetMyGuide blog.";

export const metadata: Metadata = {
  // Re-declaring `template` here (not just a plain string) keeps the parent's
  // "%s | GetMyGuide" suffixing alive for blogs/[id]'s generated titles —
  // otherwise this segment's own title would reset the chain for its children.
  title: { template: "%s | GetMyGuide", default: TITLE },
  description: DESCRIPTION,
  keywords: ["travel blog", "travel stories India", "destination guides", "travel tips"],
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/blogs",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// No visible breadcrumbs here: this layout also wraps blogs/[id], which
// renders its own, more specific breadcrumb trail — rendering one here too
// would duplicate it on that page.
export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
