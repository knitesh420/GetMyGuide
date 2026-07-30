"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion";
import { RotatingGlobe } from "./travel";

/** The reassurance copy shown while Razorpay is doing its thing. */
const STATUS_MESSAGES = [
  "Connecting securely…",
  "Verifying payment…",
  "Confirming booking…",
  "Almost done…",
];

/** How long each message stays up before the next one takes over (ms). */
const MESSAGE_INTERVAL = 2600;

/**
 * Full-screen payment processing overlay.
 *
 * This is presentational only — it reflects a `loading` flag the caller
 * already owns, and never touches the payment lifecycle itself. It also traps
 * nothing and cancels nothing; closing it is the caller's job.
 *
 * Note the last message is sticky: the sequence advances through the list and
 * then holds on "Almost done…" rather than looping, so a slow payment never
 * appears to restart from the beginning.
 */
export default function PaymentProcessing({ open }: { open: boolean }) {
  return <AnimatePresence>{open && <ProcessingOverlay />}</AnimatePresence>;
}

/**
 * Split out so the message cursor lives and dies with the overlay — mounting
 * fresh each time is what resets it, rather than an effect that writes state
 * back on close.
 */
function ProcessingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, MESSAGE_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  // While the overlay is up the page behind it must not scroll.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-white/90 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-label="Processing payment"
    >
      <motion.div
        className="flex flex-col items-center gap-6 px-6 text-center"
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={SPRING_SOFT}
      >
        <RotatingGlobe size={88} />

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Processing your payment
          </h2>

          {/* Reserved height keeps the layout from jumping as copy swaps. */}
          <div className="relative h-6 w-[260px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                className="absolute inset-0 text-sm font-medium text-slate-500"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {STATUS_MESSAGES[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Step pips — a coarse sense of progress without faking a percentage. */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {STATUS_MESSAGES.map((message, i) => (
            <motion.span
              key={message}
              className="h-1.5 rounded-full bg-red-600"
              animate={{
                width: i === messageIndex ? 28 : 8,
                opacity: i <= messageIndex ? 1 : 0.25,
              }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            />
          ))}
        </div>

        <p className="max-w-xs text-xs text-slate-400">
          Please don&apos;t close this window or press back.
        </p>
      </motion.div>
    </motion.div>
  );
}
