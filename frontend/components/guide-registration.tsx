// "use client";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { CheckCircle, Star, Shield, Globe, Award, Users } from "lucide-react";
// import { useLanguage } from "@/contexts/LanguageContext";
// import Link from "next/link";

// export function GuideRegistration() {
//   const { t } = useLanguage();

//   const benefits = [
//     {
//       icon: Star,
//       titleKey: "benefit_title_1",
//       descriptionKey: "benefit_desc_1",
//     },
//     {
//       icon: Shield,
//       titleKey: "benefit_title_2",
//       descriptionKey: "benefit_desc_2",
//     },
//     {
//       icon: Globe,
//       titleKey: "benefit_title_3",
//       descriptionKey: "benefit_desc_3",
//     },
//     {
//       icon: Award,
//       titleKey: "benefit_title_4",
//       descriptionKey: "benefit_desc_4",
//     },
//   ];

//   const requirementKeys = [
//     "req_1",
//     "req_2",
//     "req_3",
//     "req_4",
//     "req_5",
//     "req_6",
//   ];

//   const appStepKeys = [
//     "app_step_1",
//     "app_step_2",
//     "app_step_3",
//     "app_step_4",
//     "app_step_5",
//   ];

//   return (
//     <section id="guides" className="py-20 bg-background">
//       <div className="container mx-auto px-4 max-w-7xl">
//         <div className="grid lg:grid-cols-2 gap-12 items-center">
//           {/* Left Content */}
//           <div className="animate-slide-in-left">
//             {/* <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
//               {t("join_our_network")}
//             </Badge> */}
//             <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
//               {t("become_certified_guide")}
//             </h2>
//             <p className="text-xl text-secondary mb-8 text-balance">
//               {t("guide_reg_desc")}
//             </p>

//             {/* Benefits */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
//               {benefits.map((benefit) => {
//                 const Icon = benefit.icon;
//                 return (
//                   <div
//                     key={benefit.titleKey}
//                     className="flex items-start space-x-3"
//                   >
//                     <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
//                       <Icon className="w-5 h-5 text-secondary" />
//                     </div>
//                     <div>
//                       <h4 className="font-semibold text-primary mb-1">
//                         {t(benefit.titleKey)}
//                       </h4>
//                       <p className="text-sm text-secondary">
//                         {t(benefit.descriptionKey)}
//                       </p>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//             <Link href="/register-guide">
//               <Button
//                 size="lg"
//                 className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
//               >
//                 {t("start_application")}
//               </Button>
//             </Link>
//           </div>

//           {/* Right Content - Requirements Card */}
//           <div className="animate-slide-in-right">
//             <Card className="border-0 shadow-xl">
//               <CardHeader className="bg-secondary text-secondary-foreground rounded-t-lg">
//                 <CardTitle className="flex items-center text-xl">
//                   <Users className="w-6 h-6 mr-2" />
//                   {t("guide_requirements_title")}
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="p-6">
//                 <div className="space-y-4">
//                   {requirementKeys.map((key) => (
//                     <div key={key} className="flex items-start space-x-3">
//                       <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
//                       <span className="text-foreground">{t(key)}</span>
//                     </div>
//                   ))}
//                 </div>

//                 <div className="mt-6 p-4 bg-card rounded-lg">
//                   <h4 className="font-semibold text-primary mb-2">
//                     {t("app_process_title")}
//                   </h4>
//                   <div className="text-sm text-secondary space-y-1">
//                     {appStepKeys.map((key) => (
//                       <p key={key}>{t(key)}</p>
//                     ))}
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Shield, Globe, Award, Users, Rocket, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { cn } from "@/lib/utils";

const benefits = [
  { icon: Star,   titleKey: "benefit_title_1", descriptionKey: "benefit_desc_1", delay: "delay-[100ms]" },
  { icon: Shield, titleKey: "benefit_title_2", descriptionKey: "benefit_desc_2", delay: "delay-[200ms]" },
  { icon: Globe,  titleKey: "benefit_title_3", descriptionKey: "benefit_desc_3", delay: "delay-[300ms]" },
  { icon: Award,  titleKey: "benefit_title_4", descriptionKey: "benefit_desc_4", delay: "delay-[400ms]" },
];

const requirementKeys = ["req_1", "req_2", "req_3", "req_4", "req_5", "req_6"];
const appStepKeys     = ["app_step_1", "app_step_2", "app_step_3", "app_step_4", "app_step_5"];

export function GuideRegistration() {
  const { t } = useLanguage();

  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes gr-slide-left {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gr-slide-right {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gr-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gr-badge-pop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes gr-check-pop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes gr-step-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gr-icon-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
        @keyframes gr-border-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(15,110,86,0); }
          50%       { box-shadow: 0 0 0 5px rgba(15,110,86,0.12); }
        }
        @keyframes gr-heading-shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .gr-anim-left  { animation: gr-slide-left  0.6s cubic-bezier(.22,1,.36,1) both; }
        .gr-anim-right { animation: gr-slide-right 0.6s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .gr-badge-anim { animation: gr-badge-pop   0.5s cubic-bezier(.22,1,.36,1) 0.2s both; }
        .gr-heading-shimmer {
          background: linear-gradient(135deg, hsl(var(--primary)) 40%, hsl(var(--secondary)) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gr-card-glow { animation: gr-border-glow 3s ease infinite 1s; }
        .gr-benefit-card { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .gr-benefit-card:hover { transform: translateY(-3px); border-color: hsl(var(--secondary)); box-shadow: 0 4px 18px rgba(15,110,86,0.12); }
        .gr-benefit-card:hover .gr-benefit-icon { animation: gr-icon-pulse 0.5s ease; }
        .gr-req-row { transition: background 0.2s ease, border-color 0.2s ease; }
        .gr-req-row:hover { background: hsl(var(--secondary)/0.08); border-color: hsl(var(--secondary)/0.4); }
        .gr-req-row:hover .gr-req-check { background: hsl(var(--secondary)/0.15); }
        .gr-cta-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .gr-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px hsl(var(--secondary)/0.35); }
        .gr-cta-btn:active { transform: translateY(0) scale(0.98); }
      `}</style>

      <section id="guides" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* ── Left column ─────────────────────────────── */}
            <div className="gr-anim-left">

              {/* Badge */}
              <div className="gr-badge-anim inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-4 bg-secondary/10 text-secondary border border-secondary/20">
                <Award className="w-3.5 h-3.5" />
                {t("join_our_network")}
              </div>

              {/* Heading */}
              <h2 className="gr-heading-shimmer text-4xl md:text-5xl font-bold mb-5 leading-tight">
                {t("become_certified_guide")}
              </h2>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                {t("guide_reg_desc")}
              </p>

              {/* Benefits grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-9">
                {benefits.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.titleKey}
                      className={cn(
                        "gr-benefit-card flex items-start gap-3 p-3.5 rounded-xl",
                        "border border-border/50 bg-secondary/5",
                        `animate-[gr-fade-up_0.5s_ease_both] ${b.delay}`,
                      )}
                    >
                      <div className="gr-benefit-icon w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4.5 h-4.5 text-secondary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-primary mb-0.5">
                          {t(b.titleKey)}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(b.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <Link href="/register-guide">
                <Button
                  size="lg"
                  className="gr-cta-btn gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-xl px-6"
                >
                  <Rocket className="w-4 h-4" />
                  {t("start_application")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* ── Right column ─────────────────────────────── */}
            <div className="gr-anim-right">
              <Card className="gr-card-glow border-0 shadow-xl rounded-2xl overflow-hidden">

                {/* Card header */}
                <CardHeader className="!gap-0 !p-0">
                  <div className="bg-gradient-to-r from-secondary to-secondary/80 px-6 py-5 flex items-center gap-3 rounded-t-2xl">
                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-secondary-foreground text-base">
                        {t("guide_requirements_title")}
                      </CardTitle>
                      <p className="text-secondary-foreground/70 text-xs mt-0.5">
                        {requirementKeys.length} criteria to qualify
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-5">

                  {/* Requirements list */}
                  <div className="space-y-2.5">
                    {requirementKeys.map((key, i) => (
                      <div
                        key={key}
                        className={cn(
                          "gr-req-row flex items-start gap-3 px-3.5 py-2.5 rounded-lg",
                          "border border-border/40 bg-muted/30",
                          `animate-[gr-fade-up_0.4s_ease_both]`,
                        )}
                        style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                      >
                        <div className="gr-req-check w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-200">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <span className="text-sm text-foreground leading-relaxed">
                          {t(key)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Application process */}
                  <div className="bg-muted/40 rounded-xl p-4 border border-border/30">
                    <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-secondary/15 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-secondary" />
                      </span>
                      {t("app_process_title")}
                    </h4>

                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-secondary/20" />

                      <div className="space-y-3">
                        {appStepKeys.map((key, i) => (
                          <div
                            key={key}
                            className={`flex items-start gap-3 animate-[gr-step-in_0.4s_ease_both]`}
                            style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                          >
                            <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                              {t(key)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}