"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE_OUT, SPRING_SOFT, staggerParent } from "@/lib/motion";
import { AnimatedCross } from "./StatusIcons";

/**
 * Payment failure panel — animated cross, the reason from the server, and the
 * two things a stuck user actually wants: try again, or back out.
 *
 * Rendered as a modal-style overlay so it can't be missed, but it is purely
 * presentational: `onRetry` / `onBack` are the caller's existing handlers.
 */
export default function PaymentFailure({
  open,
  reason,
  onRetry,
  onBack,
  retryLabel = "Retry Payment",
  backLabel = "Go Back",
}: {
  open: boolean;
  /** Message from the payment/booking error state. */
  reason?: string | null;
  onRetry: () => void;
  onBack: () => void;
  retryLabel?: string;
  backLabel?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="alertdialog"
          aria-modal="true"
          aria-label="Payment failed"
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={SPRING_SOFT}
          >
            <motion.div
              variants={staggerParent(0.1)}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center"
            >
              <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                <AnimatedCross size={84} />
              </motion.div>

              <motion.h2
                className="mt-5 text-xl font-bold text-slate-900"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
                }}
              >
                Payment Failed
              </motion.h2>

              <motion.p
                className="mt-2 text-sm leading-relaxed text-slate-500"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
                }}
              >
                {reason || "We couldn't complete your payment. No amount has been deducted — please try again."}
              </motion.p>

              <motion.div
                className="mt-6 flex w-full flex-col gap-2"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
                }}
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={onRetry} className="w-full red-gradient font-semibold">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {retryLabel}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={onBack} variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {backLabel}
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
