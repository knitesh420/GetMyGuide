"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Shield, Globe, Award, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

export function GuideRegistration() {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: Star,
      titleKey: "benefit_title_1",
      descriptionKey: "benefit_desc_1",
    },
    {
      icon: Shield,
      titleKey: "benefit_title_2",
      descriptionKey: "benefit_desc_2",
    },
    {
      icon: Globe,
      titleKey: "benefit_title_3",
      descriptionKey: "benefit_desc_3",
    },
    {
      icon: Award,
      titleKey: "benefit_title_4",
      descriptionKey: "benefit_desc_4",
    },
  ];

  const requirementKeys = [
    "req_1",
    "req_2",
    "req_3",
    "req_4",
    "req_5",
    "req_6",
  ];

  const appStepKeys = [
    "app_step_1",
    "app_step_2",
    "app_step_3",
    "app_step_4",
    "app_step_5",
  ];

  return (
    <section id="guides" className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="animate-slide-in-left">
            <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
              {t("join_our_network")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
              {t("become_certified_guide")}
            </h2>
            <p className="text-xl text-secondary mb-8 text-balance">
              {t("guide_reg_desc")}
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.titleKey}
                    className="flex items-start space-x-3"
                  >
                    <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary mb-1">
                        {t(benefit.titleKey)}
                      </h4>
                      <p className="text-sm text-secondary">
                        {t(benefit.descriptionKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {t("start_application")}
              </Button>
            </Link>
          </div>

          {/* Right Content - Requirements Card */}
          <div className="animate-slide-in-right">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-secondary text-secondary-foreground rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <Users className="w-6 h-6 mr-2" />
                  {t("guide_requirements_title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {requirementKeys.map((key) => (
                    <div key={key} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{t(key)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-card rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">
                    {t("app_process_title")}
                  </h4>
                  <div className="text-sm text-secondary space-y-1">
                    {appStepKeys.map((key) => (
                      <p key={key}>{t(key)}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
