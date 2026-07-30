import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "Read GetMyGuide's privacy policy to understand how we collect, use, and protect your personal information.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["GetMyGuide privacy policy", "data protection"],
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/privacy-policy",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Privacy Policy", href: "/privacy-policy" }]} />
      {children}
    </>
  );
}
