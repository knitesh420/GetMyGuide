import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/config";

const TITLE = "Refund & Cancellation Policy";
const DESCRIPTION =
  "Learn about GetMyGuide's refund and cancellation policy for tour bookings and guide reservations.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["refund policy", "cancellation policy", "booking cancellation GetMyGuide"],
  alternates: { canonical: "/refund-and-cancellation" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/refund-and-cancellation",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ name: "Refund & Cancellation", href: "/refund-and-cancellation" }]} />
      {children}
    </>
  );
}
