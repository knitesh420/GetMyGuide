"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  Users,
  Calendar,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

const slidesData = [
  {
    video: "/videos/video-3.mp4",
    image:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=3871&auto=format&fit=crop",
    titleKey: "hero_title_taj",
    subtitleKey: "hero_subtitle_taj",
    categoryKey: "hero_category_taj",
    location: "Agra, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.9" },
  },
  {
    video: "/videos/video-1.mp4",
    image:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=3870&auto=format&fit=crop",
    titleKey: "hero_title_rajasthan",
    subtitleKey: "hero_subtitle_rajasthan",
    categoryKey: "hero_category_rajasthan",
    location: "Jaisalmer, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.8" },
  },
  {
    video: "/videos/video-2.mp4",
    image:
      "https://images.unsplash.com/photo-1609920658906-8223bd289001?q=80&w=3902&auto=format&fit=crop",
    titleKey: "hero_title_kerala",
    subtitleKey: "hero_subtitle_kerala",
    categoryKey: "hero_category_kerala",
    location: "Kerala, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.9" },
  },
  {
    video: "/videos/video-3.mp4",
    image:
      "https://images.unsplash.com/photo-1532664189809-02133fee698d?q=80&w=3870&auto=format&fit=crop",
    titleKey: "hero_title_varanasi",
    subtitleKey: "hero_subtitle_varanasi",
    categoryKey: "hero_category_varanasi",
    location: "Varanasi, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.7" },
  },
  {
    video: "/videos/video-1.mp4",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=3871&auto=format&fit=crop",
    titleKey: "hero_title_himalayas",
    subtitleKey: "hero_subtitle_himalayas",
    categoryKey: "hero_category_himalayas",
    location: "Himachal Pradesh, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.8" },
  },
  {
    video: "/videos/video-2.mp4",
    image:
      "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?q=80&w=3869&auto=format&fit=crop",
    titleKey: "hero_title_goa",
    subtitleKey: "hero_subtitle_goa",
    categoryKey: "hero_category_goa",
    location: "Goa, India",
    stats: { tours: "100+", guides: "2000+", rating: "4.9" },
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide(
      (prev) => (prev - 1 + slidesData.length) % slidesData.length
    );
  };

  const currentSlideData = slidesData[currentSlide];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
    center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black py-20 lg:py-24">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
            scale: { duration: 0.5 },
          }}
          className="absolute inset-0"
        >
          {/* <img
            src={currentSlideData.image}
            alt={t(currentSlideData.titleKey)}
            className="w-full h-full object-cover"
          /> */}

          <video
            src={currentSlideData.video}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster={currentSlideData.image}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 text-center text-white px-6 md:px-8 max-w-5xl lg:max-w-6xl mx-auto space-y-6">
        <motion.div
          key={`content-${currentSlide}`}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-block">
            <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-full px-5 py-2 mb-6 shadow-lg">
              <span className="text-sm font-semibold text-white tracking-wide">
                {t(currentSlideData.categoryKey)}
              </span>
            </div>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-snug tracking-tight"
          >
            {t(currentSlideData.titleKey)}
          </motion.h1>
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <MapPin className="w-5 h-5 text-orange-400" />
            <p className="text-lg md:text-xl text-orange-200 font-medium">
              {currentSlideData.location}
            </p>
          </motion.div>
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl lg:text-2xl mb-8 text-balance opacity-90 max-w-2xl mx-auto font-light"
          >
            {t(currentSlideData.subtitleKey)}
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8 lg:mb-10"
          >
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-xl transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6 mr-2 text-orange-400" />
                <div className="text-3xl font-bold text-white">
                  {currentSlideData.stats.tours}
                </div>
              </div>
              <div className="text-sm text-white/90 font-medium">
                {t("tours_available")}
              </div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-xl transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 mr-2 text-blue-400" />
                <div className="text-3xl font-bold text-white">
                  {currentSlideData.stats.guides}
                </div>
              </div>
              <div className="text-sm text-white/90 font-medium">
                {t("expert_guides")}
              </div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-xl transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-center mb-2">
                <Star className="w-6 h-6 mr-2 text-yellow-400 fill-current" />
                <div className="text-3xl font-bold text-white">
                  {currentSlideData.stats.rating}
                </div>
              </div>
              <div className="text-sm text-white/90 font-medium">
                {t("average_rating")}
              </div>
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
          >
            <Link href="/tours">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-6 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all"
              >
                <Calendar className="w-5 h-5 mr-2" />
                {t("book_your_tour_now")}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-black px-10 py-6 text-lg font-semibold bg-white/5 backdrop-blur-sm rounded-full shadow-2xl transform hover:scale-105 transition-all"
              >
                <Users className="w-5 h-5 mr-2" />
                {t("become_a_guide")}
              </Button>
            </Link>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-wrap justify-center items-center gap-8 text-sm"
          >
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              {t("verified_guides")}
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              {t("secure_payments")}
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
              {t("support_24_7")}
            </div>
          </motion.div>
        </motion.div>
      </div>
      <motion.button
        onClick={prevSlide}
        whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        whileTap={{ scale: 0.95 }}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-colors shadow-xl"
      >
        <ChevronLeft className="w-7 h-7 text-white" />
      </motion.button>
      <motion.button
        onClick={nextSlide}
        whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.3)" }}
        whileTap={{ scale: 0.95 }}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-colors shadow-xl"
      >
        <ChevronRight className="w-7 h-7 text-white" />
      </motion.button>
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
        {slidesData.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setDirection(index > currentSlide ? 1 : -1);
              setCurrentSlide(index);
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className={`rounded-full transition-all duration-300 ${
              index === currentSlide
                ? "bg-white w-12 h-3"
                : "bg-white/50 w-3 h-3 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
