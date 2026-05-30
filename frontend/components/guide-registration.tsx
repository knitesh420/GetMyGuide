"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Users,
  Rocket,
  ArrowRight,
  Clock,
  Play,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/animations/motion-wrappers";

const requirementKeys = ["req_1", "req_2", "req_3", "req_4"];
const appStepKeys = ["app_step_1", "app_step_2", "app_step_3", "app_step_4"];

export function GuideRegistration() {
  const { t } = useLanguage();

  return (
    <section
      id="guides"
      className="py-12 lg:py-20 bg-gray-50/50 overflow-hidden"
    >
      <div className="container mx-auto px-4 max-w-7xl space-y-12">
        {/* ── Top heading ───────────────────────────────── */}
        <FadeUp>
          <h2
            className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight text-center"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Register as a Certified Guide{" "}
            <span className="text-red-600">with GetMyGuide</span>
          </h2>
        </FadeUp>

        {/* ── Two-column body ───────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* ── Left column — checklist + CTA ─────────── */}
          <FadeUp delay={0.15}>
            <Card className="border border-gray-100 shadow-xl rounded-[2rem] overflow-hidden bg-white h-full flex flex-col">
              <CardHeader className="!gap-0 !p-0">
                <div className="bg-gray-900 px-8 py-7 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle
                      className="text-white text-lg font-bold"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Eligibility checklist
                    </CardTitle>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {requirementKeys.length} criteria to qualify
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 flex-1 flex flex-col justify-between gap-8">
                {/* Requirements list */}
                <div className="grid gap-3">
                  {requirementKeys.map((key) => (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl",
                        "border border-gray-100 bg-gray-50/60",
                        "transition-all duration-300 hover:border-red-100 hover:bg-red-50/30 group",
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {t(key)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Start application CTA */}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-red-600 ml-0.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
                      Ready to join?
                    </p>
                    <Link href="/register-guide">
                      <Button
                        size="lg"
                        className={cn(
                          "gap-2 bg-red-600 hover:bg-red-700 text-white w-full",
                          "font-bold rounded-2xl py-6 transition-all duration-300",
                          "hover:scale-[1.02] hover:shadow-lg hover:shadow-red-600/20",
                        )}
                      >
                        <Rocket className="w-4 h-4" />
                        {t("start_application")}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* ── Right column — application steps + timer ─ */}
          <motion.div
            className="h-full"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <Card className="border border-gray-100 shadow-xl rounded-[2rem] overflow-hidden bg-white h-full flex flex-col">
              <CardHeader className="!gap-0 !p-0">
                <div className="bg-gray-900 px-8 py-7 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle
                      className="text-white text-lg font-bold"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Application process
                    </CardTitle>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {appStepKeys.length} simple steps to get started
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 flex-1 flex flex-col justify-between gap-8">
                {/* Steps timeline */}
                <div className="bg-gray-50/80 rounded-3xl p-6 border border-gray-100 flex-1">
                  <div className="relative">
                    <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-red-100" />
                    <div className="space-y-6">
                      {appStepKeys.map((key, i) => (
                        <div key={key} className="flex items-start gap-4">
                          <div className="relative z-10 w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-md shadow-red-600/20 mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed font-medium pt-0.5">
                            {t(key)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Takes 10 minutes note */}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                      Time to complete
                    </p>
                    <p className="text-sm font-bold text-gray-800">
                      Takes about 10 minutes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
