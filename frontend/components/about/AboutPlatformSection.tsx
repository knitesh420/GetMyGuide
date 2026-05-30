"use client";

import { motion } from "framer-motion";
import {
  staggerContainer,
  fadeInUp,
  slideInLeft,
  slideInRight,
} from "@/lib/motion-variants";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AboutPlatformSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-24 bg-muted/30 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.05, scale: 1 }}
        transition={{ duration: 3 }}
        className="absolute top-10 right-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch"
        >
          <motion.div
            variants={slideInLeft}
            className="flex flex-col space-y-8"
          >
            <motion.h2
              variants={fadeInUp}
              custom={0}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance leading-tight"
            >
              {t("about_platform_title")}{" "}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                GetMyGuide.in
              </span>
            </motion.h2>
            <div className="space-y-6 flex-grow">
              <motion.p
                variants={fadeInUp}
                custom={1}
                className="text-lg text-muted-foreground leading-relaxed"
              >
                {t("about_platform_p1")}
              </motion.p>
              <motion.p
                variants={fadeInUp}
                custom={2}
                className="text-lg text-muted-foreground leading-relaxed"
              >
                {t("about_platform_p2")}
              </motion.p>
              <motion.p
                variants={fadeInUp}
                custom={3}
                className="text-lg text-muted-foreground leading-relaxed"
              >
                {t("about_platform_p3")}
              </motion.p>
            </div>
            <motion.div
              variants={fadeInUp}
              custom={4}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto"
            >
              <motion.div
                whileHover={{
                  y: -5,
                  transition: { type: "spring", stiffness: 300 },
                }}
                className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border shadow-sm"
              >
                <div className="text-2xl font-bold text-primary mb-1">500+</div>
                <div className="text-sm text-muted-foreground">
                  {t("about_stat_guides")}
                </div>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -5,
                  transition: { type: "spring", stiffness: 300 },
                }}
                className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border shadow-sm"
              >
                <div className="text-2xl font-bold text-primary mb-1">150+</div>
                <div className="text-sm text-muted-foreground">
                  {t("about_stat_cities")}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={slideInRight}
            className="relative flex flex-col"
          >
            <div className="relative group flex-grow flex flex-col">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-grow rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-blue-500/10 shadow-2xl relative"
              >
                <Image
                  src={t("about_platform_logo")}
                  alt="GetMyGuide.in Logo"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out"
                  fill
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20, y: 20 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
                className="absolute -bottom-6 -left-6 bg-background border rounded-xl p-4 shadow-xl backdrop-blur-sm max-w-[180px]"
              >
                <div className="text-left">
                  <div className="text-base font-bold text-foreground mb-1">
                    {t("about_card_gov")}
                  </div>
                  <div className="text-sm text-primary font-semibold mb-1">
                    {t("about_card_cert")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("about_card_lic")}
                  </div>
                </div>
              </motion.div>
            </div>
            <motion.div
              animate={{
                rotate: 360,
                transition: { duration: 20, repeat: Infinity, ease: "linear" },
              }}
              className="absolute -top-4 -right-4 w-8 h-8 border-2 border-primary/30 rounded-full"
            />
            <motion.div
              animate={{
                y: [0, -10, 0],
                transition: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              className="absolute top-1/4 -right-6 w-4 h-4 bg-blue-500/20 rounded-full blur-sm"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
