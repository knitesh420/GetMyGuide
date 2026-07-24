"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { FloatingClouds, FlyingPlane } from "@/components/animations/travel";

const images = IMAGES.heroCarousel;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1, zIndex: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    zIndex: 0,
  }),
};

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section className="w-full bg-gray-100 pt-4 pb-10 px-4 md:px-10 lg:px-20">
      <div className="relative w-full h-[50vh] md:h-[65vh] lg:h-[78vh] overflow-hidden rounded-3xl shadow-2xl">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Slow Ken Burns push-in keeps the frame alive between slides. */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1 }}
              animate={{ scale: reduceMotion ? 1 : 1.08 }}
              transition={{ duration: 6, ease: "linear" }}
            >
              <Image
                src={images[currentSlide]}
                alt={`Certified GetMyGuide local guide leading an authentic tour experience — photo ${currentSlide + 1}`}
                fill
                priority={currentSlide === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* ── Ambient travel layer ──
            Decorative only: a scrim so the white artwork reads against any
            photo, then drifting clouds and a plane crossing the frame. */}
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/25 via-transparent to-black/20"
          aria-hidden="true"
        />
        <FloatingClouds className="z-10" />
        <FlyingPlane className="top-[18%] z-10" duration={22} />
        <FlyingPlane className="top-[62%] z-10" duration={30} delay={9} />

        {/* Prev button */}
        <motion.button
          onClick={prevSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full p-3 transition-colors shadow-xl"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </motion.button>

        {/* Next button */}
        <motion.button
          onClick={nextSlide}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 backdrop-blur-sm hover:bg-white/50 rounded-full p-3 transition-colors shadow-xl"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </motion.button>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 1 : -1);
                setCurrentSlide(index);
              }}
              whileHover={{ scale: 1.2 }}
              className={`rounded-full transition-all duration-300 ${
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
