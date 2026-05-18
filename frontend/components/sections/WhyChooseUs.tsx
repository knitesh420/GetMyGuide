"use client";

import { motion } from "framer-motion";
import { Shield, Award, Headphones, Globe2, ArrowRight } from "lucide-react";
import {
  StaggerContainer,
  StaggerItem,
  FadeUp,
} from "@/components/animations/motion-wrappers";
import Link from "next/link";

const features = [
  {
    icon: Shield,
    title: "Verified Local Guides",
    desc: "Every guide is background-checked, certified, and rated by real travellers before they join our platform.",
    color: "from-red-600 to-rose-500",
    bg: "bg-red-50",
  },
  {
    icon: Award,
    title: "Award-Winning Service",
    desc: "Rated #1 tour guide platform in customer satisfaction for 3 consecutive years across South & Southeast Asia.",
    color: "from-orange-500 to-amber-400",
    bg: "bg-orange-50",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Dedicated travel experts available round-the-clock, wherever you are — before, during, and after your tour.",
    color: "from-blue-600 to-cyan-500",
    bg: "bg-blue-50",
  },
  {
    icon: Globe2,
    title: "2000+ Expert Guides",
    desc: "Handpicked local experts across 100+ destinations covering cultural walks, eco tours, adventure & more.",
    color: "from-emerald-600 to-teal-500",
    bg: "bg-emerald-50",
  },
];

const stats = [
  { value: "100+", label: "Destinations" },
  { value: "2000+", label: "Expert Guides" },
  { value: "4.9★", label: "Avg Rating" },
  { value: "50K+", label: "Happy Travellers" },
];

export default function WhyChooseUs() {
  return (
    <section className="py-20 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Top row: text + stats */}
        <div className="grid lg:grid-cols-2 gap-16 mb-20 items-center">
          {/* Left */}
          <FadeUp>
            <div>
              <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-4">
                Why GetMyGuide
              </p>
              <h2
                className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Travel smarter with
                <br />
                <span className="text-red-600">the right guide</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
                We connect curious travellers with trusted local experts who
                turn ordinary trips into extraordinary memories.
              </p>
              <Link
                href="/about"
                className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-red-600 transition-colors group w-fit"
              >
                Learn our story
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </FadeUp>

          {/* Right: stats grid */}
          <StaggerContainer
            className="grid grid-cols-2 gap-4"
            staggerDelay={0.1}
          >
            {stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 group">
                  <p
                    className="text-4xl font-extrabold text-gray-900 mb-1 group-hover:text-red-600 transition-colors"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-gray-500 text-sm font-medium">
                    {stat.label}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Feature cards */}
        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          staggerDelay={0.1}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={f.title}>
                <motion.div
                  className="p-6 rounded-3xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500 group cursor-default"
                  whileHover={{ y: -4 }}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div
                      className={`bg-gradient-to-br ${f.color} w-8 h-8 rounded-xl flex items-center justify-center`}
                    >
                      <Icon size={16} className="text-white" />
                    </div>
                  </div>
                  <h3
                    className="font-bold text-gray-900 text-base mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
