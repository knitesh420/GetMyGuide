import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Register as a Guide — Join GetMyGuide";
const DESCRIPTION =
  "Apply to become a certified local guide on GetMyGuide. Complete your registration and start receiving bookings from travelers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["guide registration", "join as a tour guide", "guide sign up"],
  alternates: { canonical: "/register-guide" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/register-guide",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RegisterGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Register as a Guide", href: "/register-guide" }]} />
      {children}
    </>
  );
}
