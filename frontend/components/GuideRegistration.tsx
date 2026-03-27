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
    <section className="py-20 bg-card">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            {t("booking_proc_title")}
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto text-balance">
            {t("booking_proc_desc")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.titleKey}
                className="relative group hover:shadow-lg transition-all duration-300 border-0 bg-white animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 mt-4">
                    <Icon className="w-8 h-8 text-secondary" />
                  </div>

                  <h3 className="text-lg font-bold text-primary mb-2">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-secondary text-sm mb-3 text-balance">
                    {t(step.descriptionKey)}
                  </p>
                  <p className="text-xs text-secondary font-medium">
                    {t(step.detailsKey)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-10 h-10 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-secondary text-balance">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
