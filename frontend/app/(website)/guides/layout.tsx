import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Become a Local Guide — Earn with GetMyGuide";
const DESCRIPTION =
  "Turn your local knowledge into income. Join GetMyGuide as a certified tour guide and connect with travelers looking for authentic experiences.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["become a tour guide", "guide registration", "earn as a local guide"],
  alternates: { canonical: "/guides" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/guides",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Become a Guide", href: "/guides" }]} />
      {children}
    </>
  );
}
