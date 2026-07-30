import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Tour Packages & Services — Browse Curated Experiences";
const DESCRIPTION =
  "Explore curated tour packages across India — heritage walks, eco tours, cooking classes, and cultural experiences. Compare prices, duration, and destinations.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["tour packages India", "travel services", "curated tours", "book a tour package"],
  alternates: { canonical: "/services" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/services",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Services", href: "/services" }]} />
      {children}
    </>
  );
}
