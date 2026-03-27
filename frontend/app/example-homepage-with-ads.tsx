"use client";
import { TourCategories } from "@/components/TourCategories";
import { GuideRegistration } from "@/components/guide-registration";
import { BookingProcess } from "@/components/GuideRegistration";
import { Testimonials } from "@/components/testimonials";
import HeroCarousel from "@/components/HeroCarousel";
import AdvertisementDisplay from "@/components/AdvertisementDisplay";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroCarousel />

      {/* Advertisement Section - Added */}
      <section className="w-full bg-black">
        <AdvertisementDisplay 
          className="w-full h-48 md:h-64 lg:h-96"
          autoplay={true}
          muted={true}
          loop={true}
          controls={false}
        />
      </section>

      <TourCategories />
      <GuideRegistration />
      <BookingProcess />
      
      {/* Optional: Add another advertisement section before testimonials */}
      <section className="w-full bg-black mt-12">
        <AdvertisementDisplay 
          className="w-full h-40 md:h-56"
          autoplay={true}
          muted={true}
          loop={true}
          controls={false}
        />
      </section>

      <Testimonials />
    </main>
  );
}
