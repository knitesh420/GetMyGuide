"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Star, MapPin, Clock, Users } from "lucide-react";
import Link from "next/link";
import { FadeUp } from "@/components/animations/motion-wrappers";

const CATEGORIES = [
  "All",
  "Adventure",
  "Cultural",
  "Heritage",
  "Nature",
  "Food",
];

const TOURS = [
  {
    id: 1,
    title: "Jaisalmer Desert Safari & Camel Trek",
    location: "Jaisalmer",
    country: "Rajasthan",
    image:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80",
    price: 3500,
    rating: 4.9,
    reviews: 312,
    duration: "2 days",
    groupSize: "Max 12",
    badge: "Best Seller",
    category: "Adventure",
    slug: "jaisalmer-desert-safari",
  },
  {
    id: 2,
    title: "Kerala Backwaters Houseboat Experience",
    location: "Alleppey",
    country: "Kerala",
    image:
      "https://images.unsplash.com/photo-1609920658906-8223bd289001?w=600&q=80",
    price: 5200,
    rating: 4.8,
    reviews: 218,
    duration: "3 days",
    groupSize: "Max 8",
    badge: "Top Rated",
    category: "Nature",
    slug: "kerala-backwaters",
  },
  {
    id: 3,
    title: "Himachal Valley Trek & Camping",
    location: "Manali",
    country: "Himachal Pradesh",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80",
    price: 4800,
    rating: 4.7,
    reviews: 486,
    duration: "5 days",
    groupSize: "Max 10",
    badge: "Adventure",
    category: "Adventure",
    slug: "himachal-trek-camping",
  },
  {
    id: 4,
    title: "Goa Heritage Walk & Spice Tour",
    location: "Panaji",
    country: "Goa",
    image:
      "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600&q=80",
    price: 1800,
    rating: 4.6,
    reviews: 175,
    duration: "1 day",
    groupSize: "Max 15",
    badge: "Popular",
    category: "Heritage",
    slug: "goa-heritage-walk",
  },
  {
    id: 5,
    title: "Varanasi Ghats & Aarti Ceremony",
    location: "Varanasi",
    country: "Uttar Pradesh",
    image:
      "https://media.istockphoto.com/id/865075520/photo/holy-town-varanasi-and-the-river-ganges.webp?a=1&b=1&s=612x612&w=0&k=20&c=eDsBRbgdackQGpQZZba0I-mblayfLqMoTiaiMB_eCOY=",
    price: 2200,
    rating: 4.9,
    reviews: 523,
    badge: "Cultural",
    duration: "1 day",
    groupSize: "Max 12",
    category: "Cultural",
    slug: "varanasi-ghats-aarti",
  },
  {
    id: 6,
    title: "Old Delhi Street Food & Bazaar Walk",
    location: "Old Delhi",
    country: "Delhi",
    image:
      "https://images.unsplash.com/photo-1705861145316-73a2edc9e1ba?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8T2xkJTIwRGVsaGklMjBTdHJlZXQlMjBGb29kJTIwJTI2JTIwQmF6YWFyJTIwV2Fsa3xlbnwwfHwwfHx8MA%3D%3D",
    price: 1500,
    rating: 4.8,
    reviews: 398,
    duration: "Half day",
    groupSize: "Max 10",
    badge: "Food",
    category: "Food",
    slug: "old-delhi-street-food",
  },
];

export default function FeaturedTours() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [wishlisted, setWishlisted] = useState<number[]>([]);

  const filtered =
    activeCategory === "All"
      ? TOURS
      : TOURS.filter((t) => t.category === activeCategory);

  const toggleWishlist = (id: number) =>
    setWishlisted((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
          <FadeUp>
            <div>
              <p className="text-red-600 text-sm font-semibold uppercase tracking-widest mb-3">
                Curated Experiences
              </p>
              <h2
                className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Handpicked tours
                <br />
                <span className="text-red-600">across India</span>
              </h2>
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <Link
              href="/services"
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors group"
            >
              View all tours
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </FadeUp>
        </div>

        {/* Category filter pills */}
        <FadeUp delay={0.1} className="mb-10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat
                    ? "bg-gray-900 text-white shadow-lg"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                }`}
                whileTap={{ scale: 0.96 }}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </FadeUp>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          {filtered.map((tour, i) => (
            <motion.div
              key={tour.id}
              className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-black/8 transition-all duration-500"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -6 }}
            >
              {/* Image */}
              <div className="relative overflow-hidden aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tour.image}
                  alt={tour.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Badge */}
                {tour.badge && (
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-600 shadow-lg">
                    {tour.badge}
                  </div>
                )}

                {/* Wishlist */}
                <motion.button
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
                  onClick={() => toggleWishlist(tour.id)}
                  whileTap={{ scale: 0.85 }}
                >
                  <Heart
                    size={16}
                    className={`transition-colors duration-200 ${
                      wishlisted.includes(tour.id)
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400"
                    }`}
                  />
                </motion.button>

                {/* Quick view on hover */}
                <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <Link
                    href={`/services`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/95 backdrop-blur-sm rounded-xl text-sm font-semibold text-gray-800 shadow-lg hover:bg-white transition-colors"
                  >
                    View Details
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1.5">
                  {tour.category}
                </p>
                <h3
                  className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {tour.title}
                </h3>
                <div className="flex items-center gap-1 mb-3">
                  <MapPin size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500">
                    {tour.location}, {tour.country}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{tour.duration}</span>
                  </div>
                  <div className="w-px h-3 bg-gray-200" />
                  <div className="flex items-center gap-1">
                    <Users size={12} />
                    <span>{tour.groupSize}</span>
                  </div>
                </div>

                {/* Rating + Price */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={
                            i < Math.floor(tour.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200 fill-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">
                      {tour.rating}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({tour.reviews})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 leading-none">from</p>
                    <p
                      className="text-lg font-extrabold text-gray-900"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      <span className="text-sm font-semibold">₹</span>
                      {tour.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <FadeUp delay={0.2} className="mt-14 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-red-600 text-white font-semibold rounded-full shadow-xl shadow-red-600/25 hover:bg-red-700 hover:shadow-red-600/40 hover:scale-[1.02] transition-all duration-300"
          >
            Explore All Tours
            <ArrowRight size={18} />
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}
