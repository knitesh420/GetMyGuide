"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Calendar,
  CreditCard,
  MapPin,
  CheckCircle,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/motion-wrappers";
import { useLanguage } from "@/contexts/LanguageContext";

export function BookingProcess() {
  const { t } = useLanguage();

  const steps = [
    {
      icon: Search,
      titleKey: "step_1_title",
      descriptionKey: "step_1_desc",
      detailsKey: "step_1_details",
    },
    {
      icon: Calendar,
      titleKey: "step_2_title",
      descriptionKey: "step_2_desc",
      detailsKey: "step_2_details",
    },
    {
      icon: CreditCard,
      titleKey: "step_3_title",
      descriptionKey: "step_3_desc",
      detailsKey: "step_3_details",
    },
    {
      icon: CheckCircle,
      titleKey: "step_4_title",
      descriptionKey: "step_4_desc",
      detailsKey: "step_4_details",
    },
  ];

  const features = [
    {
      icon: Star,
      titleKey: "feature_1_title",
      descriptionKey: "feature_1_desc",
    },
    {
      icon: MapPin,
      titleKey: "feature_2_title",
      descriptionKey: "feature_2_desc",
    },
    {
      icon: CheckCircle,
      titleKey: "feature_3_title",
      descriptionKey: "feature_3_desc",
    },
  ];

  return (
    <section className="py-12 lg:py-20 bg-gray-50/50 relative overflow-hidden">
      {/* Attractive background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <FadeUp className="text-center mb-20">
          <h2
            className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {t("booking_proc_title")}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t("booking_proc_desc")}
          </p>
        </FadeUp>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          {/* Visual connecting line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 border-t-2 border-dashed border-gray-200 -translate-y-1/2 z-0" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative z-10"
              >
                <Card className="h-full group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 bg-white rounded-[2.5rem] overflow-visible">
                  <CardContent className="p-8 text-center flex flex-col items-center">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-lg shadow-red-600/30 rotate-3 group-hover:rotate-0 transition-transform duration-300">
                      {index + 1}
                    </div>

                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 mt-4 group-hover:scale-110 group-hover:bg-red-50 transition-all duration-300">
                      <Icon className="w-10 h-10 text-red-600" />
                    </div>

                    <h3
                      className="text-xl font-bold text-gray-900 mb-3"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                      {t(step.descriptionKey)}
                    </p>
                    <div className="mt-auto px-4 py-2 bg-gray-50 rounded-full inline-block border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-extrabold">
                        {t(step.detailsKey)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                className="flex items-center gap-5 p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Icon className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3
                    className="text-lg font-bold text-gray-900 mb-1"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm text-gray-500 leading-snug">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
