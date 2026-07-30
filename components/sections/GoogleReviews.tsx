"use client";

import { motion } from "framer-motion";
import { Star, ExternalLink } from "lucide-react";
import { FadeUp } from "@/components/animations/motion-wrappers";

const GOOGLE_REVIEWS_URL =
  "https://maps.app.goo.gl/qKCPG5E9WuWdFSTh8?g_st=awb";

const reviews = [
  {
    name: "Rahul Verma",
    avatar: "RV",
    color: "bg-blue-500",
    rating: 5,
    date: "2 weeks ago",
    text: "Absolutely fantastic experience! The guide was knowledgeable, friendly and made our trip unforgettable. Highly recommend GetMyGuide to anyone visiting India.",
  },
  {
    name: "Anjali Singh",
    avatar: "AS",
    color: "bg-green-500",
    rating: 5,
    date: "1 month ago",
    text: "Best travel experience I've had. Everything was organised perfectly from pick-up to drop-off. The local knowledge our guide had was incredible.",
  },
  {
    name: "Deepak Kumar",
    avatar: "DK",
    color: "bg-red-500",
    rating: 5,
    date: "1 month ago",
    text: "Professional, punctual and passionate guides. Booked for a Rajasthan trip and it exceeded all expectations. Will book again for our next trip!",
  },
  {
    name: "Meera Joshi",
    avatar: "MJ",
    color: "bg-purple-500",
    rating: 5,
    date: "2 months ago",
    text: "GetMyGuide helped us discover hidden gems we would never have found on our own. The team is responsive and the guides are top-notch. 5 stars!",
  },
  {
    name: "Vikram Nair",
    avatar: "VN",
    color: "bg-amber-500",
    rating: 5,
    date: "2 months ago",
    text: "Our Kerala backwaters tour was magical. The guide arranged everything seamlessly — the houseboat, the meals, the local culture. Worth every rupee!",
  },
  {
    name: "Pooja Agarwal",
    avatar: "PA",
    color: "bg-pink-500",
    rating: 5,
    date: "3 months ago",
    text: "Travelled solo and felt completely safe with GetMyGuide. The guide was attentive, informative and made me feel like family. 10/10 would recommend!",
  },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          }
        />
      ))}
    </div>
  );
}

/* Inline Google "G" SVG logo */
function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function GoogleReviews() {
  return (
    <section className="py-12 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <FadeUp className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GoogleG />
            <span className="text-gray-500 text-sm font-medium tracking-wide">
              Google Reviews
            </span>
          </div>
          <h2
            className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            What our travellers
            <br />
            <span className="text-red-600">say about us</span>
          </h2>
          {/* Overall rating */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-5xl font-extrabold text-gray-900">5.0</span>
            <div className="text-left">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={20} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-400 text-sm">Based on Google Reviews</p>
            </div>
          </div>
        </FadeUp>

        {/* Review cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              {/* Reviewer */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full ${review.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {review.avatar}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {review.name}
                  </p>
                  <p className="text-gray-400 text-xs">{review.date}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <GoogleG />
                </div>
              </div>

              <StarRow rating={review.rating} />

              <p className="mt-3 text-gray-600 text-sm leading-relaxed line-clamp-4">
                {review.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <FadeUp delay={0.2} className="text-center">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border-2 border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-400 hover:shadow-md transition-all group"
          >
            <GoogleG />
            See all reviews on Google
            <ExternalLink
              size={14}
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            />
          </a>
        </FadeUp>
      </div>
    </section>
  );
}
