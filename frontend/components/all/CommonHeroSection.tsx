"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface HeroSectionProps {
  badgeText?: string;
  title: React.ReactNode;
  description: string;
  backgroundImage: string;
  overlayOpacity?: number;
}

export default function HeroSection({
  badgeText,
  title,
  description,
  backgroundImage,
  overlayOpacity = 0.3,
}: HeroSectionProps) {
  return (
    <section className="relative w-full h-[70vh] sm:h-[80vh] lg:h-[90vh] overflow-hidden">
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt="Hero Background"
        fill
        priority
        className="absolute inset-0 object-cover brightness-50"
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[var(--primary-black)]"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex min-h-full flex-col items-center justify-center px-6 text-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {badgeText && (
          <motion.div variants={itemVariants}>
            <Badge className="mb-4 bg-primary text-primary-foreground px-4 py-2 text-md font-medium rounded-xl">
              {badgeText}
            </Badge>
          </motion.div>
        )}

        <motion.h1
          className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-6 text-balance"
          variants={itemVariants}
        >
          {title}
        </motion.h1>

        <motion.p
          className="text-xl text-primary-foreground mb-8 max-w-3xl mx-auto text-pretty"
          variants={itemVariants}
        >
          {description}
        </motion.p>
      </motion.div>
    </section>
  );
}
