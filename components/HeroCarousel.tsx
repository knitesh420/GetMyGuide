"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";

const images = IMAGES.heroCarousel;

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section className="w-full bg-gray-100 pt-4 pb-10 px-4 md:px-10 lg:px-20">
      <div className="relative w-full h-[50vh] md:h-[65vh] lg:h-[78vh] overflow-hidden rounded-3xl shadow-2xl">
        <div className="absolute inset-0">
          <Image
            src={images[currentSlide]}
            alt={`Certified GetMyGuide local guide leading an authentic tour experience — photo ${currentSlide + 1}`}
            fill
            priority={currentSlide === 0}
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        {/* Decorative scrim so the controls read against any photo. */}
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/25 via-transparent to-black/20"
          aria-hidden="true"
        />

        {/* Prev button */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full p-3 transition-colors shadow-xl"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Next button */}
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full p-3 transition-colors shadow-xl"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`rounded-full ${
                index === currentSlide
                  ? "bg-white w-8 h-2.5"
                  : "bg-white/50 w-2.5 h-2.5 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
