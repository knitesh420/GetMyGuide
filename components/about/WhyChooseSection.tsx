"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion-variants";
import {
  Globe2,
  IndianRupee ,
  MessageCircle,
  Map,
  Video,
  ShieldCheck,
  Heart,
  Brain,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WhyChooseSection() {
  const { t } = useLanguage();

  const reasons = [
    {
      icon: Globe2,
      emoji: "🌏",
      titleKey: "reason_1_title",
      descriptionKey: "reason_1_desc",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: IndianRupee,
      emoji: "💸",
      titleKey: "reason_2_title",
      descriptionKey: "reason_2_desc",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: MessageCircle,
      emoji: "🗣️",
      titleKey: "reason_3_title",
      descriptionKey: "reason_3_desc",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Map,
      emoji: "🧭",
      titleKey: "reason_4_title",
      descriptionKey: "reason_4_desc",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Video,
      emoji: "🎥",
      titleKey: "reason_5_title",
      descriptionKey: "reason_5_desc",
      color: "from-pink-500 to-rose-500",
    },
    {
      icon: ShieldCheck,
      emoji: "🏅",
      titleKey: "reason_6_title",
      descriptionKey: "reason_6_desc",
      color: "from-indigo-500 to-blue-500",
    },
    {
      icon: Heart,
      emoji: "❤️",
      titleKey: "reason_7_title",
      descriptionKey: "reason_7_desc",
      color: "from-red-500 to-pink-500",
    },
    {
      icon: Brain,
      emoji: "🧠",
      titleKey: "reason_8_title",
      descriptionKey: "reason_8_desc",
      color: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.05, scale: 1 }}
        transition={{ duration: 3 }}
        className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.03, scale: 1 }}
        transition={{ duration: 3, delay: 1 }}
        className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("why_choose_header")}
            </span>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            custom={0}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance leading-tight"
          >
            {t("why_choose_title")}
          </motion.h2>
          <motion.div
            variants={fadeInUp}
            custom={1}
            className="h-1 w-20 bg-gradient-to-r from-primary to-blue-600 rounded-full mx-auto"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {reasons.map((reason, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              custom={index}
              whileHover={{
                y: -10,
                transition: { type: "spring", stiffness: 300, damping: 20 },
              }}
              className="group relative"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${reason.color} opacity-0 group-hover:opacity-10 rounded-2xl blur-xl transition-all duration-500`}
              />
              <div className="relative bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 h-full backdrop-blur-sm">
                <motion.div
                  variants={scaleIn}
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${reason.color} p-0.5 mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                    <reason.icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
                <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {t(reason.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                  {t(reason.descriptionKey)}
                </p>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ delay: index * 0.1, duration: 0.8 }}
                  className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${reason.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div className="absolute top-4 right-4 text-2xl opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                  {reason.emoji}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
