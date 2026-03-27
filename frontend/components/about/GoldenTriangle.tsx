"use client";

import { motion } from "framer-motion";
import {
  staggerContainer,
  fadeInUp,
  slideInLeft,
  slideInRight,
  scaleIn,
} from "@/lib/motion-variants";
import { MapPin, Star, Camera, Crown } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GoldenTriangleSection() {
  const { t } = useLanguage();

  const cities = [
    { name: "Delhi", icon: "🏛️" },
    { name: "Agra", icon: "🕌" },
    { name: "Jaipur", icon: "👑" },
  ];

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.05, scale: 1 }}
        transition={{ duration: 3 }}
        className="absolute top-20 left-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        whileInView={{ opacity: 0.03, x: 0 }}
        transition={{ duration: 2 }}
        className="absolute bottom-20 right-20 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6"
            >
              <Crown className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">
                {t("gt_header")}
              </span>
            </motion.div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance leading-tight">
              {t("gt_title")}
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-pink-600 rounded-full mx-auto" />
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
            <motion.div
              variants={slideInLeft}
              className="flex flex-col space-y-8"
            >
              <div className="space-y-6 flex-grow">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("gt_p1")}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("gt_p2")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  variants={scaleIn}
                  whileHover={{
                    y: -5,
                    transition: { type: "spring", stiffness: 300 },
                  }}
                  className="bg-gradient-to-br from-orange-500/10 to-pink-500/5 rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 text-center"
                >
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent mb-2">
                    3
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {t("gt_stat_cities")}
                  </div>
                </motion.div>

                <motion.div
                  variants={scaleIn}
                  whileHover={{
                    y: -5,
                    transition: { type: "spring", stiffness: 300 },
                  }}
                  className="bg-gradient-to-br from-pink-500/10 to-orange-500/5 rounded-xl p-6 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 text-center"
                >
                  <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-orange-600 bg-clip-text text-transparent mb-2">
                    ∞
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {t("gt_stat_exp")}
                  </div>
                </motion.div>
              </div>

              <motion.div
                variants={fadeInUp}
                custom={2}
                className="grid grid-cols-3 gap-3"
              >
                {cities.map((city) => (
                  <motion.div
                    key={city.name}
                    whileHover={{
                      scale: 1.05,
                      transition: { type: "spring", stiffness: 300 },
                    }}
                    className="text-center p-4 rounded-xl bg-background/60 backdrop-blur-sm border hover:shadow-lg transition-all duration-300"
                  >
                    <div className="text-3xl mb-2">{city.icon}</div>
                    <div className="text-sm font-semibold text-foreground">
                      {city.name}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              variants={slideInRight}
              className="relative flex flex-col"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-grow rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/20 to-pink-500/10 shadow-2xl relative group"
              >
                <Image
                  src="/3.jpg"
                  alt="Golden Triangle destinations - Delhi, Agra, Jaipur"
                  fill
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      <span className="font-bold text-foreground">
                        {t("gt_overlay_title")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{t("gt_overlay_feat1")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Camera className="w-4 h-4 text-blue-500" />
                        <span>{t("gt_overlay_feat2")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -right-4 w-8 h-8 border-2 border-orange-500/30 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-1/4 -left-6 w-4 h-4 bg-pink-500/30 rounded-full blur-sm"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}