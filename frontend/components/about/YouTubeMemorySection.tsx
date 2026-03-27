"use client";

import { motion } from "framer-motion";
import {
  staggerContainer,
  fadeInUp,
  slideInLeft,
  slideInRight,
  scaleIn,
} from "@/lib/motion-variants";
// Added 'Play' to imports
import { Video, Share, Heart, Film, Play } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function YouTubeMemorySection() {
  const { t } = useLanguage();

  const features = [
    { textKey: "yt_feat_1", icon: Video, color: "from-red-500 to-pink-500" },
    { textKey: "yt_feat_2", icon: Share, color: "from-blue-500 to-cyan-500" },
    { textKey: "yt_feat_3", icon: Heart, color: "from-purple-500 to-pink-500" },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 0.05, y: 0 }}
        transition={{ duration: 3 }}
        className="absolute top-10 right-10 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeInUp}
            custom={0}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6"
            >
              <Film className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">
                {t("yt_header")}
              </span>
            </motion.div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance leading-tight">
              {t("yt_title")} 🎥
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-red-500 to-pink-600 rounded-full mx-auto" />
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
            <motion.div
              variants={slideInLeft}
              className="relative flex flex-col order-2 lg:order-1"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-grow rounded-2xl overflow-hidden bg-gradient-to-br from-red-500/20 to-pink-500/10 shadow-2xl relative group"
              >
                <Image
                  src="/1.jpg"
                  alt="Travel video creation process"
                  fill
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* === MODIFIED SECTION START: Official YouTube Button Style === */}
                <motion.a
                  href="https://www.youtube.com/@GETMYGUIDE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group/btn"
                  aria-label="Watch on YouTube"
                >
                  <div className="relative transition-transform duration-300 group-hover/btn:scale-110">
                    {/* Subtle White Glow for contrast */}
                    <div className="absolute inset-0 bg-white/20 blur-lg rounded-[20%]" />

                    {/* The Red YouTube "Squircle" Box */}
                    <div className="relative w-[88px] h-[60px] bg-[#FF0000] rounded-[18px] flex items-center justify-center shadow-2xl z-10">
                      {/* White Solid Play Icon */}
                      <Play className="w-10 h-10 text-white fill-white ml-1" />
                    </div>
                  </div>
                </motion.a>
                {/* === MODIFIED SECTION END === */}

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-red-500" />
                      <span className="font-bold text-foreground">
                        {t("yt_overlay_title")}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -left-4 w-8 h-8 border-2 border-red-500/30 rounded-full"
              />
            </motion.div>
            <motion.div
              variants={slideInRight}
              className="flex flex-col space-y-8 order-1 lg:order-2"
            >
              <div className="space-y-6 flex-grow">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("yt_p1")}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("yt_p2")}
                </p>
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      custom={3 + index}
                      whileHover={{
                        x: 10,
                        transition: { type: "spring", stiffness: 300 },
                      }}
                      className="group"
                    >
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border hover:border-red-500/30 hover:shadow-lg transition-all duration-300">
                        <motion.div
                          variants={scaleIn}
                          className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} p-0.5 group-hover:scale-110 transition-transform duration-300`}
                        >
                          <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                            <feature.icon className="w-5 h-5 text-foreground group-hover:text-red-500 transition-colors" />
                          </div>
                        </motion.div>
                        <p className="text-muted-foreground leading-relaxed pt-2 group-hover:text-foreground transition-colors">
                          {t(feature.textKey)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-red-500/10 to-pink-500/5 border border-red-500/20">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t("yt_p3")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}