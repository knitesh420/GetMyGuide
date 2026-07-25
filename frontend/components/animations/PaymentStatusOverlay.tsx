"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  LayoutDashboard,
  LifeBuoy,
  RotateCcw,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { celebrate } from "@/lib/confetti";
import { EASE_BACK, EASE_OUT, SPRING_SOFT, staggerParent } from "@/lib/motion";
import { isRetryable, moneyWasCaptured, type PaymentOutcome } from "@/lib/payment-status";
import type { PaymentStatusSnapshot } from "@/lib/hooks/usePaymentStatus";
import { AnimatedCheck, AnimatedCross } from "./StatusIcons";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/* ─────────────────────────── Presentation tables ─────────────────────────── */

type Tone = "brand" | "success" | "danger" | "caution";

const TONES: Record<
  Tone,
  { glow: string; accent: string; bar: string; button: string; chip: string }
> = {
  brand: {
    glow: "rgba(220, 38, 38, 0.20)",
    accent: "text-red-600 dark:text-red-400",
    bar: "bg-red-600",
    button: "red-gradient text-white",
    chip: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
  success: {
    glow: "rgba(16, 185, 129, 0.24)",
    accent: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    button: "bg-emerald-600 text-white hover:bg-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  danger: {
    glow: "rgba(244, 63, 94, 0.22)",
    accent: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    button: "red-gradient text-white",
    chip: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  },
  caution: {
    glow: "rgba(245, 158, 11, 0.24)",
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    button: "bg-amber-500 text-white hover:bg-amber-600",
    chip: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
};

type OutcomeView = {
  tone: Tone;
  /** The headline. `success` and the hard failures use the exact required copy. */
  title: string;
  /** One line under the headline explaining what it means for the customer. */
  body: string;
  mark: "check" | "cross" | "slash" | "alert";
};

const OUTCOME_VIEWS: Record<PaymentOutcome, OutcomeView> = {
  success: {
    tone: "success",
    title: "Payment Successful",
    body: "Your booking is confirmed. We've sent the details to your email.",
    mark: "check",
  },
  failed: {
    tone: "danger",
    title: "Payment Failed",
    body: "The payment didn't go through, and nothing has been charged. You can safely try again.",
    mark: "cross",
  },
  "network-error": {
    tone: "danger",
    title: "Payment Failed",
    body: "We lost the connection before the payment completed. Check your internet and try again — nothing has been charged.",
    mark: "cross",
  },
  // Not "Payment Failed": the customer chose to close the window, and telling
  // them something failed reads as an error they need to fix.
  cancelled: {
    tone: "caution",
    title: "Payment Cancelled",
    body: "You closed the payment window before it finished. Nothing has been charged.",
    mark: "slash",
  },
  // The one case that must never say "failed". The money is gone from the
  // customer's account; only our confirmation is missing. Calling this a failure
  // is what makes people pay a second time.
  "verification-failed": {
    tone: "caution",
    title: "Payment Received",
    body: "Your payment went through, but we couldn't confirm your booking automatically. Please don't pay again — our team will confirm it and email you shortly.",
    mark: "alert",
  },
};

/* ──────────────────────────────── Public API ─────────────────────────────── */

export type PaymentStatusOverlayProps = {
  /** The snapshot from `usePaymentStatus()`. */
  status: PaymentStatusSnapshot;
  /**
   * Closes the overlay. Called when a failure is dismissed, and on success when
   * there is nowhere to redirect to — so it must leave the user on a sane page.
   */
  onDismiss: () => void;
  /** Re-runs the payment. Hidden automatically once money has been captured. */
  onRetry?: () => void;
  /** Success primary action / auto-redirect target. */
  viewHref?: string | null;
  viewLabel?: string;
  /** Success secondary action. */
  dashboardHref?: string;
  dashboardLabel?: string;
  /** Where a captured-but-unconfirmed payment can get help. */
  supportHref?: string;
  retryLabel?: string;
  backLabel?: string;
  /**
   * Replaces the default success line. Use it where "your booking is confirmed"
   * would be wrong or over-promise — a membership whose clock starts on admin
   * approval, say.
   */
  successMessage?: string;
  /** Delay before the automatic redirect / dismiss. Kept in the 2–3s band. */
  redirectDelayMs?: number;
  /** Extra content under the message — a plan name, dates, an amount breakdown. */
  detail?: React.ReactNode;
};

/**
 * The full-screen animated payment result.
 *
 * Purely a presentation of a result the caller already has: it takes no payment
 * decisions, calls no APIs, and only ever renders `status`, which the call site
 * sets *after* the backend has confirmed the outcome.
 *
 * Interaction is blocked in two stages, on purpose:
 *
 * - **processing** — the backdrop covers the page (so nothing behind can be
 *   clicked or scrolled) but focus is *not* trapped and Escape is left alone,
 *   because the Razorpay sheet renders above this overlay and has to stay fully
 *   usable while it is open.
 * - **settled** — we own the screen, so focus is trapped inside the panel and
 *   Escape is swallowed. The result is acknowledged through the buttons or the
 *   automatic redirect, never by accidentally dismissing it.
 */
export default function PaymentStatusOverlay(props: PaymentStatusOverlayProps) {
  const { status } = props;

  return (
    <AnimatePresence>
      {status.phase !== "idle" && <Shell key="payment-status-overlay" {...props} />}
    </AnimatePresence>
  );
}

/* ──────────────────────────────── The shell ─────────────────────────────── */

function Shell({
  status,
  onDismiss,
  onRetry,
  viewHref,
  viewLabel = "View Booking",
  dashboardHref = "/dashboard/user",
  dashboardLabel = "Go to Dashboard",
  supportHref = "/contact",
  retryLabel = "Retry Payment",
  backLabel = "Go Back",
  redirectDelayMs = 2600,
  detail,
  successMessage,
}: PaymentStatusOverlayProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  const settled = status.phase === "settled";
  const outcome = status.outcome;
  const view = settled && outcome ? OUTCOME_VIEWS[outcome] : null;
  const tone = TONES[view?.tone ?? "brand"];

  // ── Scroll lock ───────────────────────────────────────────────────────────
  // Held for the whole overlay, both phases: the page behind must never move.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // ── Focus trap (settled only) ─────────────────────────────────────────────
  useEffect(() => {
    if (!settled) return;
    const node = panelRef.current;
    if (!node) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    node.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      // Escape would otherwise dismiss the result without a decision.
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === node);

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!node.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreTo?.focus?.({ preventScroll: true });
    };
  }, [settled, outcome]);

  // ── Confetti, once, only on a confirmed success ────────────────────────────
  useEffect(() => {
    if (outcome !== "success") return;
    const timer = setTimeout(() => celebrate(), 420);
    return () => clearTimeout(timer);
  }, [outcome]);

  // ── The automatic follow-up ───────────────────────────────────────────────
  // Success redirects to the confirmation page. A failure "redirects" back to
  // the payment page, which is the page underneath — so it dismisses.
  const autoTarget = outcome === "success" ? (viewHref ?? null) : null;
  const hasAutoAction =
    settled && outcome !== null && outcome !== "verification-failed";

  const navigatedRef = useRef(false);
  const runAutoAction = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (autoTarget) router.push(autoTarget);
    else onDismiss();
  }, [autoTarget, onDismiss, router]);

  // A failure's reason is the one thing the user needs to read, so a tap or a
  // key press cancels its auto-dismiss and hands control back. A success
  // redirect is expected, and lands where the primary button goes anyway, so it
  // is never paused.
  //
  // Deliberately not wired to focus: the panel focuses itself for the trap
  // below, which would otherwise cancel every automatic action instantly.
  const pausable = outcome !== "success";
  const [paused, setPaused] = useState(false);

  // Counted off a deadline rather than decremented, so the number on screen and
  // the navigation can't drift apart. The initial state is already the full
  // count, and this shell is remounted per attempt, so nothing needs resetting.
  const [remaining, setRemaining] = useState(() => Math.ceil(redirectDelayMs / 1000));

  useEffect(() => {
    if (!hasAutoAction || paused) return;

    const deadline = Date.now() + redirectDelayMs;
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    const done = setTimeout(runAutoAction, redirectDelayMs);

    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [hasAutoAction, paused, redirectDelayMs, runAutoAction]);

  const holdAuto = pausable ? () => setPaused(true) : undefined;

  /** Wraps a button action so it also cancels the pending auto-navigation. */
  const act = (fn: () => void) => () => {
    navigatedRef.current = true;
    setPaused(true);
    fn();
  };

  const goTo = (href: string) => act(() => router.push(href));

  return (
    <motion.div
      className="fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      // Pointer events land here, never on the page behind.
      onPointerDown={holdAuto}
      onKeyDownCapture={holdAuto}
      role="alertdialog"
      aria-modal={settled ? true : undefined}
      aria-live="assertive"
      aria-busy={!settled}
      aria-label={view ? view.title : "Processing payment"}
    >
      {/* Frosted scrim */}
      <div className="fixed inset-0 -z-10 bg-white/80 backdrop-blur-xl dark:bg-slate-950/85" />

      {/* Tone-coloured aura behind the card — the only thing that changes colour
          between states, which is what makes the transition feel intentional. */}
      <motion.div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        animate={{ background: `radial-gradient(60% 50% at 50% 42%, ${tone.glow} 0%, transparent 70%)` }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-[28px] bg-white/95 p-7 text-center shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] outline-none",
          "ring-1 ring-slate-900/5 sm:p-9 dark:bg-slate-900/95 dark:ring-white/10",
        )}
        // `layout` carries the height change from the processing panel to the
        // taller result panel; without it the card collapses and pops back out
        // in the gap that `mode="wait"` leaves between them.
        layout
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={reduceMotion ? { duration: 0.2 } : SPRING_SOFT}
      >
        <AnimatePresence mode="wait">
          {!settled || !view || !outcome ? (
            <ProcessingPanel key="processing" reduceMotion={reduceMotion} />
          ) : (
            <motion.div
              key={outcome}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <ResultPanel
                view={view}
                outcome={outcome}
                status={status}
                tone={tone}
                detail={detail}
                successMessage={successMessage}
              />

              <motion.div
                className="mt-7 flex flex-col gap-2.5"
                variants={staggerParent(0.07, 0.35)}
                initial="hidden"
                animate="visible"
              >
                {outcome === "success" && (
                  <>
                    <ActionButton
                      label={viewLabel}
                      icon={Ticket}
                      className={tone.button}
                      onClick={viewHref ? goTo(viewHref) : act(onDismiss)}
                    />
                    <ActionButton
                      label={dashboardLabel}
                      icon={LayoutDashboard}
                      variant="outline"
                      onClick={goTo(dashboardHref)}
                    />
                  </>
                )}

                {isRetryable(outcome) && (
                  <>
                    {onRetry && (
                      <ActionButton
                        label={retryLabel}
                        icon={RotateCcw}
                        className={tone.button}
                        onClick={act(onRetry)}
                      />
                    )}
                    <ActionButton
                      label={backLabel}
                      icon={ArrowLeft}
                      variant={onRetry ? "ghost" : "outline"}
                      onClick={act(onDismiss)}
                    />
                  </>
                )}

                {/* No retry here — see `moneyWasCaptured`. */}
                {moneyWasCaptured(outcome) && (
                  <>
                    <ActionButton
                      label={dashboardLabel}
                      icon={LayoutDashboard}
                      className={tone.button}
                      onClick={goTo(dashboardHref)}
                    />
                    <ActionButton
                      label="Contact Support"
                      icon={LifeBuoy}
                      variant="outline"
                      onClick={goTo(supportHref)}
                    />
                  </>
                )}
              </motion.div>

              {hasAutoAction && !paused && (
                <RedirectCountdown
                  seconds={remaining}
                  delayMs={redirectDelayMs}
                  barClassName={tone.bar}
                  label={autoTarget ? "Redirecting" : "Returning to payment"}
                  reduceMotion={reduceMotion}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────── Processing ──────────────────────────────── */

const PROCESSING_MESSAGES = [
  "Talking to your bank…",
  "Verifying the payment…",
  "Confirming your booking…",
  "Almost done…",
];

const MESSAGE_INTERVAL = 2200;

/**
 * The beat before the verdict. Mounted fresh each time, so the message cursor
 * resets without an effect writing state back on close. The last message is
 * sticky rather than looping — a slow verification shouldn't look like it
 * restarted from the beginning.
 */
function ProcessingPanel({ reduceMotion }: { reduceMotion: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => Math.min(i + 1, PROCESSING_MESSAGES.length - 1));
    }, MESSAGE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <ProcessingOrbit reduceMotion={reduceMotion} />

      <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        Processing your payment
      </h2>

      {/* Fixed height so the card doesn't resize as the copy swaps. */}
      <div className="relative mt-2 h-6 w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="absolute inset-0 text-sm font-medium text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            {PROCESSING_MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Coarse progress, without faking a percentage we don't have. */}
      <div className="mt-6 flex items-center gap-2" aria-hidden="true">
        {PROCESSING_MESSAGES.map((message, i) => (
          <motion.span
            key={message}
            className="h-1.5 rounded-full bg-red-600"
            animate={{ width: i === index ? 30 : 8, opacity: i <= index ? 1 : 0.2 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          />
        ))}
      </div>

      <p className="mt-6 max-w-[16rem] text-xs leading-relaxed text-slate-400">
        Please don&apos;t close this window or press back.
      </p>
    </motion.div>
  );
}

/** Concentric rings with a sweeping arc and a locked-up shield in the middle. */
function ProcessingOrbit({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="relative h-24 w-24" aria-hidden="true">
      {/* Breathing halo */}
      {!reduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-full bg-red-500/10"
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Track + sweeping arc */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: reduceMotion ? 3.2 : 1.6, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="5"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="70 194"
          className="stroke-red-600"
        />
      </motion.svg>

      {/* Counter-rotating inner ring adds depth without extra colour */}
      {!reduceMotion && (
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        >
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="16 40"
            className="stroke-orange-400/70"
          />
        </motion.svg>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ShieldCheck className="h-7 w-7 text-red-600" />
        </motion.span>
      </div>
    </div>
  );
}

/* ──────────────────────────────── The result ─────────────────────────────── */

function ResultPanel({
  view,
  outcome,
  status,
  tone,
  detail,
  successMessage,
}: {
  view: OutcomeView;
  outcome: PaymentOutcome;
  status: PaymentStatusSnapshot;
  tone: (typeof TONES)[Tone];
  detail?: React.ReactNode;
  successMessage?: string;
}) {
  // The server's own words win on a failure — it knows why better than we do.
  // On success we never show a raw server string, so the caller's override (or
  // our default) is the whole message.
  const message =
    outcome === "success"
      ? (successMessage ?? view.body)
      : (status.reason || view.body);

  const rise = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  };

  return (
    <motion.div
      className="flex flex-col items-center"
      variants={staggerParent(0.09)}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
        <StatusMark mark={view.mark} />
      </motion.div>

      <motion.h2
        className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
        variants={rise}
      >
        {view.title}
      </motion.h2>

      <motion.p
        className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
        variants={rise}
      >
        {message}
      </motion.p>

      {status.amount != null && (
        <motion.div
          className={cn(
            "mt-4 inline-flex items-baseline gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold",
            tone.chip,
          )}
          variants={rise}
        >
          <span className="text-xs font-medium opacity-70">
            {outcome === "success" ? "Paid" : "Amount"}
          </span>
          ₹{status.amount.toLocaleString("en-IN")}
        </motion.div>
      )}

      {detail && (
        <motion.div className="mt-4 w-full" variants={rise}>
          {detail}
        </motion.div>
      )}

      {status.reference && (
        <motion.div className="mt-4 w-full" variants={rise}>
          <PaymentReference value={status.reference} highlight={moneyWasCaptured(outcome)} />
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * The payment id, copyable.
 *
 * Prominent when money was captured but the booking wasn't confirmed: it is the
 * only thing that lets support find the charge, so it has to survive the trip
 * from this screen to an email.
 */
function PaymentReference({ value, highlight }: { value: string; highlight: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context, or the user said no). The id is on
      // screen and selectable, so there's nothing to report.
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left",
        highlight
          ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900"
          : "bg-slate-50 dark:bg-slate-800/60",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Payment reference
        </p>
        <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label={copied ? "Reference copied" : "Copy payment reference"}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

/** Routes each outcome to its mark, reusing the shared check/cross drawings. */
function StatusMark({ mark }: { mark: OutcomeView["mark"] }) {
  if (mark === "check") return <AnimatedCheck size={96} />;
  if (mark === "cross") return <AnimatedCross size={92} />;
  return <CautionMark glyph={mark} />;
}

/**
 * Amber counterpart to the check/cross: the ring draws, then the glyph lands.
 * A slash for "you stopped it", an exclamation for "this needs attention".
 */
function CautionMark({ glyph }: { glyph: "slash" | "alert" }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="relative inline-flex h-[92px] w-[92px]">
      <motion.svg
        viewBox="0 0 52 52"
        className="h-full w-full"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_BACK }}
        role="img"
        aria-label={glyph === "slash" ? "Cancelled" : "Needs attention"}
      >
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          strokeWidth="3"
          className="stroke-amber-500"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          style={{ rotate: -90, transformOrigin: "center" }}
        />

        {glyph === "slash" ? (
          <motion.path
            d="M17 26 L35 26"
            strokeWidth="4"
            strokeLinecap="round"
            className="stroke-amber-500"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.45 }}
          />
        ) : (
          <>
            <motion.path
              d="M26 15 L26 30"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-amber-500"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : 0.45 }}
            />
            <motion.circle
              cx="26"
              cy="37"
              r="2.4"
              className="fill-amber-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, delay: reduceMotion ? 0 : 0.7, ease: EASE_BACK }}
              style={{ transformOrigin: "center" }}
            />
          </>
        )}
      </motion.svg>
    </div>
  );
}

/* ─────────────────────────────── Chrome bits ─────────────────────────────── */

function ActionButton({
  label,
  icon: Icon,
  onClick,
  className,
  variant = "default",
}: {
  label: string;
  icon: typeof Ticket;
  onClick: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
      }}
    >
      <Button
        onClick={onClick}
        variant={variant}
        size="lg"
        className={cn("h-12 w-full font-semibold", className)}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </motion.div>
  );
}

/** Depleting bar plus a spoken count, so the redirect is never a surprise. */
function RedirectCountdown({
  seconds,
  delayMs,
  barClassName,
  label,
  reduceMotion,
}: {
  seconds: number;
  delayMs: number;
  barClassName: string;
  label: string;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      className="mt-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className={cn("h-full rounded-full", barClassName)}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: reduceMotion ? 0 : delayMs / 1000, ease: "linear" }}
          style={{ originX: 0 }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {label} in {seconds}s — or choose an option above.
      </p>
    </motion.div>
  );
}
