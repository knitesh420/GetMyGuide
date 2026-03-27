"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

export default function SafetyGuidelinesPage() {
  const guidelines = [
    {
      title: "Verify Your Guide",
      description:
        "Check your guide’s profile and ID on our platform upon meeting them.",
    },
    {
      title: "Share Your Itinerary",
      description:
        "Let a friend or family member know your tour plans and guide’s contact details.",
    },
    {
      title: "Stay Aware of Your Surroundings",
      description:
        "Be mindful of your personal belongings, especially in crowded areas.",
    },
    {
      title: "Follow Local Customs",
      description:
        "Respect local traditions, dress codes, and etiquette. Your guide can provide advice.",
    },
    {
      title: "Health and Hydration",
      description:
        "Carry necessary personal medications and stay hydrated, especially in hot weather.",
    },
    {
      title: "Emergency Contacts",
      description:
        "Save local emergency numbers and our 24/7 support line on your phone.",
    },
    {
      title: "Trust Your Instincts",
      description:
        "If a situation feels unsafe, remove yourself from it and contact your guide or our support team immediately.",
    },
  ];

  return (
    <main className="py-24 sm:py-32 bg-background">
      <div className="container max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Safety Guidelines
            </h1>
            <p className="text-lg text-muted-foreground">
              Your safety is our top priority. Please follow these guidelines
              for a secure and enjoyable experience.
            </p>
          </header>

          <div className="space-y-6">
            {guidelines.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-4 p-6 bg-card rounded-lg border"
              >
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
