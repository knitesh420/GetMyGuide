"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // YEH LINE ADD KARNI THI
import {
  Search,
  UserCheck,
  CreditCard,
  MapPin,
  Star,
  Shield,
  CheckCircle,
  Phone,
  Users,
  Award,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import HeroSection from "@/components/all/CommonHeroSection";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    {
      step: 1,
      icon: <Search className="w-8 h-8" />,
      titleKey: "how_step_1_title",
      descriptionKey: "how_step_1_desc",
      detailsKeys: [
        "how_step_1_detail_1",
        "how_step_1_detail_2",
        "how_step_1_detail_3",
        "how_step_1_detail_4",
      ],
    },
    {
      step: 2,
      icon: <UserCheck className="w-8 h-8" />,
      titleKey: "how_step_2_title",
      descriptionKey: "how_step_2_desc",
      detailsKeys: [
        "how_step_2_detail_1",
        "how_step_2_detail_2",
        "how_step_2_detail_3",
        "how_step_2_detail_4",
      ],
    },
    {
      step: 3,
      icon: <CreditCard className="w-8 h-8" />,
      titleKey: "how_step_3_title",
      descriptionKey: "how_step_3_desc",
      detailsKeys: [
        "how_step_3_detail_1",
        "how_step_3_detail_2",
        "how_step_3_detail_3",
        "how_step_3_detail_4",
      ],
    },
    {
      step: 4,
      icon: <MapPin className="w-8 h-8" />,
      titleKey: "how_step_4_title",
      descriptionKey: "how_step_4_desc",
      detailsKeys: [
        // "how_step_4_detail_1",
        // "how_step_4_detail_2",
        "how_step_4_detail_3",
        "how_step_4_detail_4",
      ],
    },
  ];

  const safetyFeatures = [
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      titleKey: "how_safety_feat_1_title",
      descriptionKey: "how_safety_feat_1_desc",
    },
    {
      icon: <Phone className="w-6 h-6 text-secondary" />,
      titleKey: "how_safety_feat_2_title",
      descriptionKey: "how_safety_feat_2_desc",
    },
    {
      icon: <MapPin className="w-6 h-6 text-accent" />,
      titleKey: "how_safety_feat_3_title",
      descriptionKey: "how_safety_feat_3_desc",
    },
    {
      icon: <Star className="w-6 h-6 text-green-600" />,
      titleKey: "how_safety_feat_4_title",
      descriptionKey: "how_safety_feat_4_desc",
    },
  ];

  const paymentProcess = [
    {
      step: "1",
      titleKey: "how_payment_step_1_title",
      descriptionKey: "how_payment_step_1_desc",
      amountKey: "how_payment_step_1_amount",
      timingKey: "how_payment_step_1_timing",
    },
    {
      step: "2",
      titleKey: "how_payment_step_2_title",
      descriptionKey: "how_payment_step_2_desc",
      amountKey: "how_payment_step_2_amount",
      timingKey: "how_payment_step_2_timing",
    },
    {
      step: "3",
      titleKey: "how_payment_step_3_title",
      descriptionKey: "how_payment_step_3_desc",
      amountKey: "how_payment_step_3_amount",
      timingKey: "how_payment_step_3_timing",
    },
    {
      step: "4",
      titleKey: "how_payment_step_4_title",
      descriptionKey: "how_payment_step_4_desc",
      amountKey: "how_payment_step_4_amount",
      timingKey: "how_payment_step_4_timing",
    },
  ];

  const guideProcess = [
    {
      step: "1",
      titleKey: "how_guide_step_1_title",
      descriptionKey: "how_guide_step_1_desc",
    },
    {
      step: "2",
      titleKey: "how_guide_step_2_title",
      descriptionKey: "how_guide_step_2_desc",
    },
    {
      step: "3",
      titleKey: "how_guide_step_3_title",
      descriptionKey: "how_guide_step_3_desc",
    },
    {
      step: "4",
      titleKey: "how_guide_step_4_title",
      descriptionKey: "how_guide_step_4_desc",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection
          badgeText={t("how_badge")}
          title={t("how_title")}
          description={t("how_desc")}
          backgroundImage="/3.jpg"
        />

        <section className="py-16 md:py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("how_section_1_title")}
            </h2>
            <div className="space-y-16">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className={`flex flex-col lg:flex-row items-center gap-8 ${index % 2 === 1 ? "lg:flex-row-reverse" : ""
                    }`}
                >
                  <div
                    className="flex-1 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="relative h-64 md:h-80 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={`/${step.step}.jpg`}
                        alt={t(step.titleKey)}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div
                    className="flex-1 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.2 + 0.1}s` }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                        {step.step}
                      </div>
                      <div className="text-primary">{step.icon}</div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                      {t(step.descriptionKey)}
                    </p>
                    <ul className="space-y-2">
                      {step.detailsKeys.map((detailKey, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span>{t(detailKey)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-card border-y">
          <div className="container max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("how_payment_title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {paymentProcess.map((payment, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-xl transition-shadow duration-300 animate-fade-in-up border-0"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {payment.step}
                    </div>
                    <CardTitle className="text-lg">
                      {t(payment.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">
                      {t(payment.descriptionKey)}
                    </p>
                    <Badge variant="outline" className="mb-2">
                      {t(payment.amountKey)}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {t(payment.timingKey)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <p className="text-lg text-muted-foreground">
                <Shield className="w-5 h-5 inline mr-2" />
                {t("how_payment_footer")}
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("how_safety_title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {safetyFeatures.map((feature, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-xl transition-shadow duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">
                      {t(feature.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      {t(feature.descriptionKey)}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-card border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                {t("how_for_guides_title")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                {guideProcess.map((process, index) => (
                  <div
                    key={index}
                    className="text-center animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                      {process.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {t(process.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(process.descriptionKey)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Link href="/guides/register" passHref>
                  <Button
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    {t("how_for_guides_button")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {t("how_faq_title")}
            </h2>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {t("how_faq_travelers")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q1")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a1")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q2")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a2")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q3")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a3")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="animate-fade-in-up"
                style={{ animationDelay: "200ms" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-secondary" />
                    {t("how_faq_guides")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q4")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a4")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q5")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a5")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{t("how_faq_q6")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("how_faq_a6")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 heritage-gradient text-red-500">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("how_cta_title")}
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-black">
              {t("how_cta_desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tours" passHref>
                <Button
                  size="lg"
                  className="bg-white  text-secondary hover:bg-gray-100"
                >
                  {t("how_cta_button1")}
                </Button>
              </Link>
              <Link href="/tours" passHref>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white bg-red-500 text-white hover:bg-red-500 hover:text-secondary"
                >
                  {t("how_cta_button2")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}