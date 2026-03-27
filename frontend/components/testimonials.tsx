"use client";

import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchTestimonials } from "@/lib/redux/testimonialSlice";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Star,
  Quote,
  User,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader,
  VolumeX,
  Volume2,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/motion-variants";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Helper: Get Flag URL from Country Code ---
// Uses flagcdn.com (e.g., 'IN' -> Indian Flag)
const getFlagUrl = (countryCode: string) => {
  if (!countryCode) return null;
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};

export function Testimonials() {
  const { t } = useLanguage();
  const dispatch: AppDispatch = useDispatch();
  const { testimonials, loading, error, total } = useSelector(
    (state: RootState) => state.testimonials
  );

  // Carousel Setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    dragFree: false,
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  // Fetch Data
  useEffect(() => {
    dispatch(fetchTestimonials({ limit: 10, visible: true }));
  }, [dispatch]);

  // Carousel Listeners
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Calculate Average Rating
  const averageRating =
    testimonials.length > 0
      ? (
        testimonials.reduce((acc, t) => acc + (t.rating || 0), 0) /
        testimonials.length
      ).toFixed(1)
      : "0.0";

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container max-w-7xl mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Header Section */}
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("testimonials_title_community")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("testimonials_desc")}
            </p>
          </motion.div>

          {/* Carousel Section */}
          <motion.div variants={fadeInUp} className="relative">
            {loading && (
              <div className="flex justify-center items-center h-96">
                <Loader className="w-12 h-12 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="text-center h-96 flex items-center justify-center text-red-500">
                <p>Error: {error}</p>
              </div>
            )}

            {!loading && !error && testimonials.length === 0 && (
              <div className="text-center h-96 flex items-center justify-center text-muted-foreground">
                <p>{t("no_testimonials")}</p>
              </div>
            )}

            {!loading && !error && testimonials.length > 0 && (
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-4">
                  {testimonials.map((testimonial) => (
                    <div
                      className="flex-[0_0_95%] md:flex-[0_0_50%] pl-4"
                      key={testimonial._id}
                    >
                      {testimonial.video ? (
                        <VideoSlide testimonial={testimonial} t={t} />
                      ) : (
                        <TextSlide testimonial={testimonial} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {!loading && testimonials.length > 2 && (
              <>
                <Button
                  onClick={scrollPrev}
                  disabled={!prevBtnEnabled}
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 -left-4 md:-left-6 -translate-y-1/2 rounded-full w-12 h-12 shadow-lg z-10 bg-background"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <Button
                  onClick={scrollNext}
                  disabled={!nextBtnEnabled}
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 -right-4 md:-right-6 -translate-y-1/2 rounded-full w-12 h-12 shadow-lg z-10 bg-background"
                >
                  <ArrowRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </motion.div>

          {/* Stats Section */}
          <motion.div
            variants={fadeInUp}
            className="mt-20 pt-16 border-t border-border"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem number="10,000+" label={t("stat_happy_travelers")} />
              <StatItem number={`${total}`} label={t("stat_total_reviews")} />
              <StatItem number="200+" label={t("stat_expert_guides")} />
              <StatItem number={averageRating} label={t("stat_avg_rating")} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// --- Sub-Component: Stats Item ---
const StatItem = ({ number, label }: { number: string; label: string }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ y: -5 }}
    className="text-center group cursor-default"
  >
    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
      {number}
    </div>
    <div className="text-muted-foreground font-medium">{label}</div>
  </motion.div>
);

// --- Sub-Component: Video Slide ---
const VideoSlide = memo(function VideoSlide({
  testimonial,
  t,
}: {
  testimonial: any;
  t: (key: string) => string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setHasError(true));
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setHasError(true);
    const onLoadedData = () => {
      setIsLoaded(true);
      video.play().catch(() => { });
    };
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("volumechange", onVolumeChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, []);

  if (hasError) {
    return (
      <Card className="w-full aspect-video rounded-2xl overflow-hidden relative bg-muted flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-2">{t("video_unavailable")}</p>
          <p className="text-sm text-muted-foreground">{testimonial.name}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full aspect-video rounded-2xl overflow-hidden relative group shadow-md border-0">
      <video
        ref={videoRef}
        src={testimonial.video}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Loading Spinner */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <Loader className="w-10 h-10 animate-spin text-white" />
        </div>
      )}

      {/* Play/Pause Overlay */}
      <div
        className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 cursor-pointer ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        onClick={togglePlay}
      >
        {!isPlaying && <Play className="w-16 h-16 text-white drop-shadow-lg" />}
      </div>

      {/* Volume Button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full w-10 h-10"
        onClick={toggleMute}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </Button>

      {/* Info Bar (Name + Flag + Position) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent text-white pointer-events-none">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-lg flex items-center gap-2 drop-shadow-md">
              {testimonial.name}
              {/* Flag Display */}
              {testimonial.country && (
                <img
                  src={getFlagUrl(testimonial.country)}
                  alt={testimonial.country}
                  className="w-6 h-auto rounded-sm shadow-sm"
                  loading="lazy"
                />
              )}
            </h4>
            {testimonial.position && (
              <p className="text-sm opacity-90 text-gray-200">{testimonial.position}</p>
            )}
          </div>
          {/* Rating Stars in Overlay */}
          <div className="flex gap-0.5">
            {[...Array(testimonial.rating || 5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-current drop-shadow-md" />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
});

// --- Sub-Component: Text Slide ---
const TextSlide = memo(function TextSlide({ testimonial }: { testimonial: any }) {
  return (
    <Card className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden bg-card border shadow-sm p-8 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-4">
          <Quote className="w-10 h-10 text-primary/20" />
          <div className="flex items-center gap-1">
            {[...Array(testimonial.rating || 5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
            ))}
          </div>
        </div>

        {/* Message (Handle optional) */}
        {testimonial.message ? (
          <p className="text-lg text-foreground leading-relaxed line-clamp-6">
            "{testimonial.message}"
          </p>
        ) : (
          <p className="text-lg text-muted-foreground italic leading-relaxed">
            (Video review provided)
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/50">
        {testimonial.image ? (
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="w-12 h-12 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
        )}

        <div>
          <h4 className="font-bold text-foreground flex items-center gap-2">
            {testimonial.name}
            {/* Flag Display */}
            {testimonial.country && (
              <img
                src={getFlagUrl(testimonial.country)}
                alt={testimonial.country}
                className="w-10 h-auto rounded-sm shadow-sm"
                loading="lazy"
              />
            )}
          </h4>
          {testimonial.position && (
            <p className="text-sm text-muted-foreground">{testimonial.position}</p>
          )}
        </div>
      </div>
    </Card>
  );
});