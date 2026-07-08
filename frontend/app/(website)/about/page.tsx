import type { Metadata } from "next";
import AboutPlatformSection from "@/components/about/AboutPlatformSection";
import AimsObjectivesSection from "@/components/about/AimsObjectivesSection";
import GoldenTriangleSection from "@/components/about/GoldenTriangle";
import MissionVisionSection from "@/components/about/MissionVisionSection";
import WhyChooseSection from "@/components/about/WhyChooseSection";
import WhyGuideSection from "@/components/about/WhyGuideSection";
import YouTubeMemorySection from "@/components/about/YouTubeMemorySection";
import HeroSection from "@/components/all/CommonHeroSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { IMAGES } from "@/lib/images";

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
      <HeroSection
        backgroundImage={IMAGES.aboutHero}
        imageAlt="Travelers exploring an authentic local experience with a GetMyGuide certified guide"
        // badgeText="About GetMyGuide"
        title={
          <>
            Discover Authentic <br /> Local Experiences
          </>
        }
        description="Connecting travelers with authentic local experiences through certified guides across India."
      />
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
