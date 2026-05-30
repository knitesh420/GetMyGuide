"use client";

import { motion } from "framer-motion";
import { Instagram, Heart, MessageCircle, ExternalLink } from "lucide-react";
import { FadeUp } from "@/components/animations/motion-wrappers";

const posts = [
  {
    image:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=500&q=80",
    likes: "3.2K",
    comments: "114",
    caption: "Desert gold in Jaisalmer 🐪",
    tall: true,
  },
  {
    image:
      "https://images.unsplash.com/photo-1609920658906-8223bd289001?w=500&q=80",
    likes: "2.8K",
    comments: "98",
    caption: "Kerala backwaters at dawn 🌅",
    tall: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=80",
    likes: "4.1K",
    comments: "176",
    caption: "Himachal peaks calling 🏔️",
    tall: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=500&q=80",
    likes: "5.6K",
    comments: "231",
    caption: "Goa sunsets never disappoint 🌊",
    tall: true,
  },
  {
    image:
      "https://images.unsplash.com/photo-1627894483216-2138af692e32?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8VmFyYW5hc2klMjBtb3JuaW5nJTIwYWFydGl8ZW58MHx8MHx8fDA%3D",
    likes: "2.4K",
    comments: "89",
    caption: "Varanasi morning aarti 🪔",
    tall: false,
  },
  {
    image:
      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80",
    likes: "1.9K",
    comments: "67",
    caption: "Old Delhi food trails 🍢",
    tall: false,
  },
];

export default function SocialSection() {
  return (
    <section className="py-12 lg:py-20 bg-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <FadeUp>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 via-pink-500 to-orange-400 flex items-center justify-center">
                  <Instagram size={16} className="text-white" />
                </div>
                <span className="text-white/50 text-sm font-medium">
                  @GetMyGuide
                </span>
              </div>
              <h2
                className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Moments shared
                <br />
                <span className="text-red-400">by our travellers</span>
              </h2>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-white/10 transition-colors group"
            >
              <Instagram size={16} />
              Follow Us
              <ExternalLink
                size={13}
                className="opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </a>
          </FadeUp>
        </div>

        {/* Masonry grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {posts.map((post, i) => (
            <motion.div
              key={i}
              className={`relative overflow-hidden rounded-2xl lg:rounded-3xl group cursor-pointer`}
              style={{ aspectRatio: post.tall ? "3/4" : "1/1" }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400" />

              {/* Content on hover */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all duration-400">
                <div className="flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Instagram size={14} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-2 line-clamp-1">
                    {post.caption}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-white/90">
                      <Heart size={13} className="fill-white" />
                      <span className="text-xs font-semibold">
                        {post.likes}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/90">
                      <MessageCircle size={13} />
                      <span className="text-xs font-semibold">
                        {post.comments}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <FadeUp delay={0.2} className="mt-12 text-center">
          <p className="text-white/40 text-sm">
            Tag us{" "}
            <span className="text-red-400 font-semibold">#GetMyGuide</span> and
            get featured in our gallery
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
