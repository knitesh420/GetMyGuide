"use client";

import { TourCategories } from "@/components/TourCategories";
import { GuideRegistration } from "@/components/guide-registration";
import { BookingProcess } from "@/components/GuideRegistration";
import HeroCarousel from "@/components/HeroCarousel";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import FeaturedTours from "@/components/sections/FeaturedTours";
import Destinations from "@/components/sections/Destinations";
import Testimonials from "@/components/sections/Testimonials";
import SocialSection from "@/components/sections/SocialSection";
import { ScrollProgress, BackToTop } from "@/components/ui/ScrollUtils";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Scroll progress bar at top */}
      <ScrollProgress />

      {/* Back-to-top floating button */}
      <BackToTop />

      {/* 1. Existing hero carousel — untouched */}
      <HeroCarousel />

      {/* 2. NEW — Why choose us + stats */}
      <WhyChooseUs />

      {/* 3. Existing tour categories */}
      <TourCategories />

      {/* 4. NEW — Featured tours with filter */}
      <FeaturedTours />

      {/* 5. NEW — Top destinations */}
      <Destinations />

      {/* 6. Existing guide registration */}
      <GuideRegistration />

      {/* 7. Existing booking process */}
      <BookingProcess />

      {/* 8. NEW — Testimonials carousel */}
      <Testimonials />

      {/* 9. NEW — Social / Instagram section */}
      <SocialSection />
    </main>
  );
}
