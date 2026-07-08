import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Sign Up as a Traveler — Find Your Perfect Guide";
const DESCRIPTION =
  "Create a traveler account on GetMyGuide to search certified local guides and book authentic tours across India.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["traveler sign up", "find a guide account", "GetMyGuide registration"],
  alternates: { canonical: "/register-tourist" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/register-tourist",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RegisterTouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Find a Guide", href: "/register-tourist" }]} />
      {children}
    </>
  );
}
