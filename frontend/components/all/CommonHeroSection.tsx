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
  title?: React.ReactNode;
  description?: string;
  backgroundImage: string;
  overlayOpacity?: number;
  /** Override the default fixed-height image band, e.g. "w-full aspect-[2/1]"
   * to match a specific image's native ratio so nothing gets cropped. */
  imageContainerClassName?: string;
  /** Darkens the image so overlaid text stays readable. Set false when the
   * hero has no badge/title/description on top of the image. */
  dimImage?: boolean;
  /** Extra classes on the <Image> itself, e.g. responsive object-position
   * ("object-[72%_40%] sm:object-center") when imageContainerClassName crops
   * to a different ratio per breakpoint and the focal point needs to shift. */
  imageClassName?: string;
}

const DEFAULT_IMAGE_CONTAINER_CLASSNAME =
  "h-[280px] w-full sm:h-[340px] md:h-[400px] lg:h-[460px] xl:h-[500px]";

export default function HeroSection({
  badgeText,
  title,
  description,
  backgroundImage,
  overlayOpacity = 0.3,
  imageContainerClassName = DEFAULT_IMAGE_CONTAINER_CLASSNAME,
  dimImage = true,
  imageClassName = "",
}: HeroSectionProps) {
  return (
    <section className="relative w-full bg-black py-10 md:py-16">
      {/* Both children share one grid cell: the row is sized to the taller of the
          two, so the badge/title/description are never clipped, but in the normal
          case it simply matches the (compact, fixed) image height below. */}
      <div className="relative mx-auto grid w-[90%] place-items-center">
        {/* Image band: fixed, professional height per breakpoint by default. object-cover
            fills the rectangle edge-to-edge, cropping overflow as needed. Pass
            imageContainerClassName to match a specific image's aspect ratio instead. */}
        <div
          className={`relative col-start-1 row-start-1 overflow-hidden ${imageContainerClassName}`}
        >
          <Image
            src={backgroundImage}
            alt="Hero Background"
            fill
            priority
            sizes="90vw"
            className={`object-cover ${dimImage ? "brightness-50" : ""} ${imageClassName}`}
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

          {title && (
            <motion.h1
              className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-6 text-balance"
              variants={itemVariants}
            >
              {title}
            </motion.h1>
          )}

          {description && (
            <motion.p
              className="text-xl text-primary-foreground mb-8 max-w-3xl mx-auto text-pretty"
              variants={itemVariants}
            >
              {description}
            </motion.p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
