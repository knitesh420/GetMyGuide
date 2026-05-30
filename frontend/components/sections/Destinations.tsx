"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import {
  FadeUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/animations/motion-wrappers";

const destinations = [
  {
    name: "Rajasthan",
    tagline: "Land of royals",
    image:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tours: 280,
    href: "/services",
  },
  {
    name: "Kerala",
    tagline: "God's own country",
    image:
      "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tours: 22,
    href: "/services",
  },
  {
    name: "Himachal",
    tagline: "Roof of India",
    image:
      "https://plus.unsplash.com/premium_photo-1697729733902-f8c92710db07?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tours: 180,
    href: "/services",
  },
  {
    name: "Goa",
    tagline: "Sun, sand & vibes",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tours: 15,
    href: "/services",
  },
  {
    name: "Uttarakhand",
    tagline: "Abode of the gods",
    image:
      "https://images.unsplash.com/photo-1612438214708-f428a707dd4e?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tours: 300,
    href: "/services",
  },
  {
    name: "Golden Triangle",
    tagline: "Delhi-Jaipur-Agra",
    image:
      "https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=1170&auto=format&fit=crop",
    tours: 700,
    href: "/services",
  },
  {
    name: "Varanasi",
    tagline: "City of eternal light",
    image:
      "https://images.unsplash.com/photo-1561359313-0639aad49ca6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmFyYW5hc2l8ZW58MHx8MHx8fDA%3D",
    tours: 100,
    href: "/services",
  },
  {
    name: "Ladakh",
    tagline: "Land of high passes",
    image:
      "https://images.unsplash.com/photo-1598091383021-15ddea10925d?q=80&w=1170&auto=format&fit=crop",
    tours: 39,
    href: "/services",
  },
];

export default function Destinations() {
  return (
    <section className="py-12 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <FadeUp>
            <div>
              <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-3">
                Top Picks
              </p>
              <h2
                className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Most-loved
                <br />
                <span className="text-red-600">destinations</span>
              </h2>
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <Link
              href="/services"
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors group"
            >
              All destinations
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </FadeUp>
        </div>

        {/* Grid */}
        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          staggerDelay={0.1}
        >
          {destinations.map((dest) => (
            <StaggerItem key={dest.name}>
              <motion.div
                className="relative rounded-3xl overflow-hidden group cursor-pointer"
                style={{ aspectRatio: "3/4" }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={dest.href} className="block w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-1 mb-1 text-white/60">
                      <MapPin size={11} />
                      <span className="text-xs">{dest.tours} tours</span>
                    </div>
                    <h3
                      className="text-2xl font-extrabold text-white mb-0.5"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {dest.name}
                    </h3>
                    <p className="text-white/70 text-sm">{dest.tagline}</p>

                    {/* Explore pill on hover */}
                    <div className="mt-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-red-600">
                        Explore →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
