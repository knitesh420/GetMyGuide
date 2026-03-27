"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  Clock,
  IndianRupee, 
  CheckCircle,
  ArrowRight,
  Badge,
} from "lucide-react";
import HeroSection from "@/components/all/CommonHeroSection";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext"; // Import karein
import router from "next/router";

export default function BecomeAGuidePage() {
  const { t } = useLanguage(); // Add karein

  const benefits = [
    {
      icon: <IndianRupee  className="w-8 h-8 text-primary" />,
      titleKey: "guide_page_benefit_1_title",
      descriptionKey: "guide_page_benefit_1_desc",
    },
    {
      icon: <Clock className="w-8 h-8 text-primary" />,
      titleKey: "guide_page_benefit_2_title",
      descriptionKey: "guide_page_benefit_2_desc",
    },
    {
      icon: <Award className="w-8 h-8 text-primary" />,
      titleKey: "guide_page_benefit_3_title",
      descriptionKey: "guide_page_benefit_3_desc",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-green-600" />,
      titleKey: "guide_page_benefit_4_title",
      descriptionKey: "guide_page_benefit_4_desc",
    },
  ];

  const requirementKeys = [
    "guide_page_req_1",
    "guide_page_req_2",
    "guide_page_req_3",
    "guide_page_req_4",
    "guide_page_req_5",
    "guide_page_req_6",
  ];

  const verificationSteps = [
    "guide_page_step_1",
    "guide_page_step_2",
    "guide_page_step_3",
    "guide_page_step_4",
  ];

  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection
          // badgeText={t("guide_page_badge")}
          title={t("guide_page_title")}
          description={t("guide_page_desc")}
          backgroundImage="/1.jpg"
        />

        <section className="py-16 md:py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("guide_page_why_join")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-xl transition-shadow duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      {benefit.icon}
                    </div>
                    <CardTitle className="text-xl">
                      {t(benefit.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {t(benefit.descriptionKey)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-8 pb-5 md:pt-12 md:pb-6 bg-gray-50 dark:bg-gray-900/50 border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {t("guide_page_requirements_title")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div>
                  <h3 className="text-2xl font-semibold mb-6">
                    {t("guide_page_what_we_look_for")}
                  </h3>
                  <ul className="space-y-4">
                    {requirementKeys.map((key, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground">{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-6">
                    {t("guide_page_verification_title")}
                  </h3>
                  <div className="space-y-4">
                    {verificationSteps.map((stepKey, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-muted-foreground">{t(stepKey)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="display flex justify-center mt-5">
            <Link href="/become-guide" passHref>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-md"
              >
                {t("guide_page_badge")}
              </Button>
            </Link>
          </div>
        </section>

        <section>
          <div className="container mx-auto px-4 py-1 md:py-1 text-center"></div>
        </section>

        <section className="py-20 md:py-28 text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("guide_page_cta_title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t("guide_page_cta_desc")}
            </p>
            <Link href="/register" passHref>
              <Button size="lg" className="text-lg h-14 px-8">
                {t("guide_page_cta_button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
