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
    <section className="relative w-full bg-black py-10 md:py-16">
      {/* Both children share one grid cell: the row is sized to the taller of the
          two, so the badge/title/description are never clipped, but in the normal
          case it simply matches the (compact, fixed) image height below. */}
      <div className="relative mx-auto grid w-[90%] place-items-center">
        {/* Image band: fixed, professional height per breakpoint. object-cover
            fills the rectangle edge-to-edge, cropping overflow as needed. */}
        <div className="relative col-start-1 row-start-1 h-[280px] w-full overflow-hidden sm:h-[340px] md:h-[400px] lg:h-[460px] xl:h-[500px]">
          <Image
            src={backgroundImage}
            alt="Hero Background"
            fill
            priority
            sizes="90vw"
            className="object-cover brightness-50"
          />

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 col-start-1 row-start-1 flex w-full flex-col items-center justify-center px-6 text-center"
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
      </div>
    </section>
  );
}
