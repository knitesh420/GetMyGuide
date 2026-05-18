"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { FadeUp } from "@/components/animations/motion-wrappers";

const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Marketing Director",
    location: "Mumbai",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
    text: "Our Rajasthan desert safari was absolutely incredible. The guide knew every hidden gem in Jaisalmer — from secret dunes to the best chai spots. Truly an experience of a lifetime!",
    rating: 5,
    tour: "Jaisalmer Desert Safari",
  },
  {
    id: 2,
    name: "Arjun Mehta",
    role: "Software Engineer",
    location: "Bengaluru",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
    text: "GetMyGuide made our Himachal trek seamless. Our certified guide was knowledgeable, safety-conscious and made the whole group feel comfortable. 10/10 would book again!",
    rating: 5,
    tour: "Himachal Valley Trek",
  },
  {
    id: 3,
    name: "Sneha Patel",
    role: "Entrepreneur",
    location: "Ahmedabad",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80",
    text: "The Kerala backwaters houseboat experience was dreamy. Our guide arranged everything perfectly — the sunset, the meals, the local culture. Worth every rupee!",
    rating: 5,
    tour: "Kerala Backwaters",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const prev = () =>
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const t = testimonials[current];

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <FadeUp className="text-center mb-14">
          <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-3">
            Traveller Stories
          </p>
          <h2
            className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Words from our
            <br />
            <span className="text-red-600">happy explorers</span>
          </h2>
        </FadeUp>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={t.id}
              className="relative bg-white rounded-3xl p-8 lg:p-12 border border-gray-100 shadow-sm"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Big quote icon */}
              <div className="absolute top-8 right-8 opacity-10">
                <Quote size={64} className="text-red-600" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-700 text-lg lg:text-xl leading-relaxed font-medium mb-8">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-red-100"
                />
                <div>
                  <p
                    className="font-bold text-gray-900"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {t.name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t.role} · {t.location}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="inline-block px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold border border-red-100">
                    {t.tour}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              onClick={prev}
              className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
              whileTap={{ scale: 0.92 }}
            >
              <ChevronLeft size={18} />
            </motion.button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 h-2 bg-red-600"
                      : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <motion.button
              onClick={next}
              className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
              whileTap={{ scale: 0.92 }}
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
