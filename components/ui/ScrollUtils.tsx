"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 to-orange-500 z-[9999] origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToTop}
          // z-40: floating furniture, same band as the WhatsApp bubble it
          // stacks above. See the z-index scale in globals.css.
          className="fixed bottom-20 right-5 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-shadow"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
