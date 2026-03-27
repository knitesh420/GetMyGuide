import AboutPlatformSection from "@/components/about/AboutPlatformSection"
import AimsObjectivesSection from "@/components/about/AimsObjectivesSection"
import GoldenTriangleSection from "@/components/about/GoldenTriangle"
import MissionVisionSection from "@/components/about/MissionVisionSection"
import WhyChooseSection from "@/components/about/WhyChooseSection"
import WhyGuideSection from "@/components/about/WhyGuideSection"
import YouTubeMemorySection from "@/components/about/YouTubeMemorySection"
import HeroSection from "@/components/all/CommonHeroSection"


export const metadata = {
  title: "About IndiaTourManager.com",
  description:
    "Learn about IndiaTourManager.com - connecting certified tour guides with international travellers across India.",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection
          backgroundImage="/2.jpg"
          badgeText="About GetMyGuide"
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
  )
}
