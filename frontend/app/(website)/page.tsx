"use client";
import { TourCategories } from "@/components/TourCategories";
import { GuideRegistration } from "@/components/guide-registration";
import { BookingProcess } from "@/components/GuideRegistration";
import { Testimonials } from "@/components/testimonials";
import HeroCarousel from "@/components/HeroCarousel";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroCarousel />
      <TourCategories />
      <GuideRegistration />
      <BookingProcess />
    </main>
  );
}
