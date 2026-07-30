import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Safety Guidelines";
const DESCRIPTION =
  "Safety guidelines and best practices for travelers and guides using the GetMyGuide platform.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["travel safety guidelines", "guide safety", "safe travel India"],
  alternates: { canonical: "/safety-guidelines" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/safety-guidelines",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function SafetyGuidelinesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Safety Guidelines", href: "/safety-guidelines" }]} />
      {children}
    </>
  );
}
