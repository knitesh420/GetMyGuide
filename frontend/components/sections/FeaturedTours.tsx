"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, Star, MapPin, Clock, Users } from "lucide-react";
import Link from "next/link";
import { FadeUp } from "@/components/animations/motion-wrappers";
import { AnimatedCompass } from "@/components/animations/travel";

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
      "https://images.unsplash.com/photo-1605944087400-8a5992d7b066?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 3500,
    rating: 4.9,
    reviews: 312,
    duration: "2 days",
    groupSize: "Max 12",
    badge: "Best Seller",
    category: "Adventure",
    description:
      "Ride across the golden sand dunes of the Thar Desert on camelback, sleep under a canopy of stars at a desert camp, and witness breathtaking sunsets over Jaisalmer's iconic Sam Sand Dunes.",
    highlights: [
      "Camel trek at sunset",
      "Overnight desert camp",
      "Folk music & dance",
      "Dune bashing by jeep",
    ],
    slug: "jaisalmer-desert-safari",
  },
  {
    id: 2,
    title: "Khajjiar, Dalhousie, Himachal Pradesh",
    location: "Alleppey",
    country: "Kerala",
    image:"https://images.unsplash.com/photo-1589702413183-ca141958b7c5?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 5200,
    rating: 4.8,
    reviews: 218,
    duration: "3 days",
    groupSize: "Max 8",
    badge: "Top Rated",
    category: "Nature",
    description:
      "Drift through the serene backwater canals of Alleppey aboard a traditional Kerala kettuvallam (houseboat), passing lush paddy fields, coconut groves, and quaint fishing villages.",
    highlights: [
      "Private houseboat stay",
      "Freshly cooked Kerala meals",
      "Village walks",
      "Sunrise over the backwaters",
    ],
    slug: "kerala-backwaters",
  },
  {
    id: 3,
    title: "Himachal Valley Trek & Camping",
    location: "Manali",
    country: "Himachal Pradesh",
    image:
      "https://images.unsplash.com/photo-1741790971887-fbf2c1023b6c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 4800,
    rating: 4.7,
    reviews: 486,
    duration: "5 days",
    groupSize: "Max 10",
    badge: "Adventure",
    category: "Adventure",
    description:
      "Trek through the dramatic mountain valleys of Himachal Pradesh — crossing alpine meadows, snow bridges, and dense pine forests — with camping under the Milky Way at high-altitude campsites near Manali.",
    highlights: [
      "High-altitude camping",
      "Beas Kund glacier trek",
      "River crossing",
      "Solang Valley views",
    ],
    slug: "himachal-trek-camping",
  },
  {
    id: 4,
    title: "Goa Heritage Walk & Spice Plantation Tour",
    location: "Panaji",
    country: "Goa",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&q=80", // Old Goa Portuguese church / heritage
    price: 1800,
    rating: 4.6,
    reviews: 175,
    duration: "1 day",
    groupSize: "Max 15",
    badge: "Popular",
    category: "Heritage",
    description:
      "Explore the UNESCO-listed churches and colonial mansions of Old Goa's Latin Quarter, then visit a working spice plantation to taste, smell, and learn about Goa's famous cardamom, vanilla, and pepper.",
    highlights: [
      "Basilica of Bom Jesus",
      "Latin Quarter walking tour",
      "Spice plantation visit",
      "Goan lunch included",
    ],
    slug: "goa-heritage-walk",
  },
  {
    id: 5,
    title: "Varanasi Ghats & Ganga Aarti Ceremony",
    location: "Varanasi",
    country: "Uttar Pradesh",
    image:
      "https://images.unsplash.com/photo-1627894483216-2138af692e32?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 2200,
    rating: 4.9,
    reviews: 523,
    duration: "1 day",
    groupSize: "Max 12",
    badge: "Cultural",
    category: "Cultural",
    description:
      "Witness the ancient soul of India along the sacred banks of the Ganges — take a dawn boat ride past 84 ghats, observe cremation rituals at Manikarnika, and experience the mesmerising Ganga Aarti ceremony at Dashashwamedh Ghat.",
    highlights: [
      "Sunrise boat ride on the Ganges",
      "Dashashwamedh Ganga Aarti",
      "Kashi Vishwanath temple",
      "Old city alley walk",
    ],
    slug: "varanasi-ghats-aarti",
  },
  {
    id: 6,
    title: "Old Delhi Street Food & Bazaar Walk",
    location: "Old Delhi",
    country: "Delhi",
    image:
      "https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80", // Chandni Chowk street food / Old Delhi market
    price: 1500,
    rating: 4.8,
    reviews: 398,
    duration: "Half day",
    groupSize: "Max 10",
    badge: "Food",
    category: "Food",
    description:
      "Dive headfirst into the sensory chaos of Chandni Chowk — tasting legendary jalebi, chole bhature, parathas, and dahi bhalle at iconic street stalls, while weaving through the spice bazaar, silver market, and centuries-old havelis.",
    highlights: [
      "Paranthe Wali Gali",
      "Khari Baoli spice market",
      "Jama Masjid visit",
      "10+ food tastings included",
    ],
    slug: "old-delhi-street-food",
  },
  {
    id: 7,
    title: "Ranthambore Tiger Safari & Wildlife Camp",
    location: "Ranthambore",
    country: "Rajasthan",
    image:
      "https://plus.unsplash.com/premium_photo-1686310335921-38acc0679321?q=80&w=1175&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 6500,
    rating: 4.8,
    reviews: 284,
    duration: "3 days",
    groupSize: "Max 6",
    badge: "Wildlife",
    category: "Wildlife",
    description:
      "Venture deep into Ranthambore National Park on early-morning jeep safaris in search of Bengal tigers, leopards, sloth bears, and crocodiles — staying at a luxury jungle camp on the park's edge.",
    highlights: [
      "3 jeep safari game drives",
      "Bengal tiger spotting",
      "Ranthambore Fort visit",
      "Naturalist-guided walks",
    ],
    slug: "ranthambore-tiger-safari",
  },
  {
    id: 8,
    title: "Rishikesh White Water Rafting & Yoga Retreat",
    location: "Rishikesh",
    country: "Uttarakhand",
    image:
      "https://images.unsplash.com/photo-1653006458813-8e102abf3b46?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8UmlzaGlrZXNoJTIwV2hpdGUlMjBXYXRlciUyMFJhZnRpbmclMjAlMjYlMjBZb2dhJTIwUmV0cmVhdHxlbnwwfHwwfHx8MA%3D%3D",
    price: 3900,
    rating: 4.7,
    reviews: 341,
    duration: "3 days",
    groupSize: "Max 14",
    badge: "Wellness",
    category: "Wellness",
    description:
      "Combine adrenaline and inner peace in the yoga capital of the world — shoot the rapids of the Ganges through grades II–IV white water, then unwind with sunrise yoga and meditation sessions on the riverbank at dusk.",
    highlights: [
      "16 km Ganges rafting stretch",
      "Daily sunrise yoga & meditation",
      "Cliff jumping & body surfing",
      "Evening Ganga Aarti at Triveni Ghat",
    ],
    slug: "rishikesh-rafting-yoga",
  },
  {
    id: 9,
    title: "Coorg Coffee Estate Walk & Plantation Stay",
    location: "Coorg",
    country: "Karnataka",
    image:
      "https://images.unsplash.com/photo-1611735341450-74d61e660ad2?q=80&w=1169&auto=format&fit=crop",
    price: 4200,
    rating: 4.6,
    reviews: 193,
    duration: "2 days",
    groupSize: "Max 10",
    badge: "Nature",
    category: "Nature",
    description:
      "Immerse yourself in the misty hills of Coorg — walk through working coffee and cardamom estates, learn the bean-to-cup process, and stay overnight in a heritage planter's bungalow surrounded by dense evergreen forest.",
    highlights: [
      "Guided coffee plantation walk",
      "Bean-to-cup brewing workshop",
      "Abbey Falls & Raja's Seat",
      "Home-cooked Kodava feast",
    ],
    slug: "coorg-coffee-plantation",
  },
  {
    id: 10,
    title: "Amritsar Golden Temple & Wagah Border Ceremony",
    location: "Amritsar",
    country: "Punjab",
    image:
      "https://images.unsplash.com/photo-1623059508779-2542c6e83753?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    price: 1900,
    rating: 4.9,
    reviews: 607,
    duration: "1 day",
    groupSize: "Max 15",
    badge: "Spiritual",
    category: "Spiritual",
    description:
      "Begin with a serene dawn visit to the breathtaking Harmandir Sahib (Golden Temple) and share a langar meal with thousands of pilgrims, then head to the Wagah Border for the electrifying flag-lowering retreat ceremony at sunset.",
    highlights: [
      "Golden Temple at sunrise",
      "Free langar community meal",
      "Wagah Border beating retreat",
      "Jallianwala Bagh memorial",
    ],
    slug: "amritsar-golden-temple-wagah",
  },
  {
    id: 11,
    title: "Andaman Snorkelling & Scuba Diving Adventure",
    location: "Havelock Island",
    country: "Andaman & Nicobar",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1170&auto=format&fit=crop",
    price: 7800,
    rating: 4.8,
    reviews: 229,
    duration: "4 days",
    groupSize: "Max 8",
    badge: "Water Sports",
    category: "Water Sports",
    description:
      "Explore the pristine coral reefs of Havelock Island beneath crystal-clear Andaman waters — snorkel at Elephant Beach, complete a beginner scuba dive at Neil Island, and relax on the powder-white sands of Radhanagar Beach.",
    highlights: [
      "Scuba dive at Neil Island",
      "Elephant Beach snorkelling",
      "Glass-bottom boat ride",
      "Radhanagar Beach sunset",
    ],
    slug: "andaman-scuba-snorkelling",
  },
  {
    id: 12,
    title: "Kolkata Art, Literature & Colonial Heritage Tour",
    location: "Kolkata",
    country: "West Bengal",
    image:
      "https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=1167&auto=format&fit=crop",
    price: 2000,
    rating: 4.7,
    reviews: 158,
    duration: "1 day",
    groupSize: "Max 12",
    badge: "Art & Culture",
    category: "Art & Culture",
    description:
      "Trace the intellectual and artistic soul of the 'City of Joy' — from the marble halls of the Victoria Memorial and College Street's labyrinthine bookshops to the potters' quarter of Kumartuli and a traditional Bengali thali lunch in a century-old house.",
    highlights: [
      "Victoria Memorial & museum",
      "College Street book market",
      "Kumartuli potters' quarter",
      "Traditional Bengali thali lunch",
    ],
    slug: "kolkata-art-heritage-tour",
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
    <section className="py-12 lg:py-20 bg-gray-50">
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
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <motion.button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                    active
                      ? "text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
                  }`}
                  whileHover={{ scale: active ? 1 : 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {/* One shared pill slides between categories. */}
                  {active && (
                    <motion.span
                      layoutId="tour-category-pill"
                      className="absolute inset-0 rounded-full bg-gray-900 shadow-lg"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </motion.button>
              );
            })}
          </div>
        </FadeUp>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          {/* `popLayout` pulls exiting cards out of flow immediately, so the
              survivors slide into their new positions instead of waiting. */}
          <AnimatePresence mode="popLayout">
          {filtered.map((tour, i) => (
            <motion.div
              key={tour.id}
              layout
              className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-black/8 transition-shadow duration-500"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
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
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.85 }}
                  aria-label={
                    wishlisted.includes(tour.id)
                      ? `Remove ${tour.title} from favourites`
                      : `Save ${tour.title} to favourites`
                  }
                  aria-pressed={wishlisted.includes(tour.id)}
                >
                  {/* The heart pops past full size on the way in — the classic
                      "it registered" beat. */}
                  <motion.span
                    key={String(wishlisted.includes(tour.id))}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: [0.6, 1.35, 1] }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <Heart
                      size={16}
                      className={`transition-colors duration-200 ${
                        wishlisted.includes(tour.id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-400"
                      }`}
                    />
                  </motion.span>
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
          </AnimatePresence>
        </motion.div>

        {/* Empty state — only reachable if a category has no tours. */}
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnimatedCompass size={88} className="mb-5" />
              <h3
                className="text-xl font-bold text-gray-900 mb-1.5"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                No tours in {activeCategory} yet
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs">
                We&apos;re still charting this one. Try another category — there&apos;s
                plenty more to explore.
              </p>
              <motion.button
                onClick={() => setActiveCategory("All")}
                className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Show all tours
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <FadeUp delay={0.2} className="mt-14 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 px-8 py-4 bg-red-600 text-white font-semibold rounded-full shadow-xl shadow-red-600/25 hover:bg-red-700 hover:shadow-red-600/40 hover:scale-[1.02] transition-all duration-300"
          >
            Explore Our Package
            <ArrowRight size={18} />
          </Link>
        </FadeUp>
      </div>
    </section>
  );
}
