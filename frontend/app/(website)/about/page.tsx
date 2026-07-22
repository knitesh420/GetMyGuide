import type { Metadata } from "next";
import AboutPlatformSection from "@/components/about/AboutPlatformSection";
import AimsObjectivesSection from "@/components/about/AimsObjectivesSection";
import GoldenTriangleSection from "@/components/about/GoldenTriangle";
import MissionVisionSection from "@/components/about/MissionVisionSection";
import WhyChooseSection from "@/components/about/WhyChooseSection";
import WhyGuideSection from "@/components/about/WhyGuideSection";
import YouTubeMemorySection from "@/components/about/YouTubeMemorySection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { IMAGES } from "@/lib/images";
import Image from "next/image";

const TITLE = "About Us — Our Mission & Certified Guide Network";
const DESCRIPTION =
  "Learn how GetMyGuide connects certified local guides with international travellers across India through heritage walks, eco tours, and authentic cultural experiences.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["about GetMyGuide", "our mission", "certified tour guides India", "local guide network"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/about",
    images: [IMAGES.aboutHero],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [IMAGES.aboutHero],
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Breadcrumbs items={[{ name: "About", href: "/about" }]} />
      {/* Banner. The flyer carries its own headline and trust badges, so it is
          shown edge-to-edge at its native 1600x639 ratio: the box scales with the
          viewport on every screen size and nothing is ever cropped or letterboxed.
          The page's h1 lives in the image, so it is repeated for screen readers
          and search engines. */}
      <section className="w-full">
        <h1 className="sr-only">
          Why hire an authorised tour guide — discover authentic local
          experiences with GetMyGuide
        </h1>
        <div className="relative aspect-1600/639 w-full">
          <Image
            src={IMAGES.aboutHero}
            alt="Why hire an authorised tour guide? Discover Incredible India with expertise and safety — book your certified local guide at getmyguide.in. Certified and government authorised, expert local knowledge, personalised experience, safe and reliable, multilingual support."
            fill
            priority
            sizes="100vw"
            className="object-contain object-center"
          />
        </div>
      </section>
      <AboutPlatformSection />
      <MissionVisionSection />
      <AimsObjectivesSection />
      <WhyGuideSection />
      <WhyChooseSection />
      <GoldenTriangleSection />
      <YouTubeMemorySection />
    </main>
  );
}
