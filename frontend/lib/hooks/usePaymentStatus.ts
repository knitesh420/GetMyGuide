"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  classifyPaymentFailure,
  type PaymentOutcome,
  type PaymentPhase,
} from "@/lib/payment-status";

/**
 * How long the processing animation is guaranteed to stay up before the result
 * replaces it.
 *
 * A verification that returns in 80 ms would otherwise flash the spinner for a
 * single frame, which reads as a glitch rather than a step. This is padding on
 * the *animation*, never on the payment: the result is already in hand when the
 * wait starts.
 */
const MIN_PROCESSING_MS = 1200;

export type PaymentStatusSnapshot = {
  phase: PaymentPhase;
  outcome: PaymentOutcome | null;
  /** Server-supplied explanation, shown verbatim when present. */
  reason: string | null;
  /** Razorpay payment id — the handle support needs to trace a real charge. */
  reference: string | null;
  /** Amount in rupees, when the caller knows it. */
  amount: number | null;
};

export type SettleDetails = {
  reason?: string | null;
  reference?: string | null;
  amount?: number | null;
};

const IDLE: PaymentStatusSnapshot = {
  phase: "idle",
  outcome: null,
  reason: null,
  reference: null,
  amount: null,
};

/**
 * Owns the lifecycle of one payment attempt for the status overlay.
 *
 * This is deliberately a *reporting* layer: it never calls an API, opens a
 * gateway or decides anything about money. Call sites keep their existing
 * payment logic and simply narrate it — `start()` when the attempt begins, then
 * exactly one of `succeed()` / `fail()` / `cancel()` once the backend has
 * spoken.
 *
 * Two guarantees the call sites would otherwise each have to reimplement:
 *
 * - **One result per attempt.** Razorpay can invoke `handler` more than once,
 *   and a double-tap can land two verifications on one order. The first result
 *   wins; later ones are dropped, so a duplicate callback can't replay the
 *   animation or fire a second redirect.
 * - **A visible processing beat.** `succeed`/`fail` are held back until
 *   `MIN_PROCESSING_MS` has passed since `start()`.
 */
export function usePaymentStatus({
  minProcessingMs = MIN_PROCESSING_MS,
}: { minProcessingMs?: number } = {}) {
  const [snapshot, setSnapshot] = useState<PaymentStatusSnapshot>(IDLE);

  // Attempt counter, not a boolean: `reset()`/`start()` open a new attempt, and
  // a late callback from the previous one must still be ignored.
  const attemptRef = useRef(0);
  const settledAttemptRef = useRef(-1);
  const startedAtRef = useRef(0);
  // Payment ids already accounted for, so the same charge can't settle twice
  // even across attempts.
  const handledRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef(true);

  const clearPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      clearPending();
    };
  }, [clearPending]);

  /** Opens a new attempt and shows the processing animation. */
  const start = useCallback(() => {
    clearPending();
    attemptRef.current += 1;
    startedAtRef.current = Date.now();
    setSnapshot({ ...IDLE, phase: "processing" });
  }, [clearPending]);

  /** Tears the overlay down without showing a result. */
  const reset = useCallback(() => {
    clearPending();
    attemptRef.current += 1;
    settledAttemptRef.current = -1;
    startedAtRef.current = 0;
    setSnapshot(IDLE);
  }, [clearPending]);

  /**
   * Records the one result for the current attempt.
   *
   * Returns false when the result was dropped as a duplicate, which lets a
   * caller skip the side effects (navigation, refetch) that go with a first
   * result.
   */
  const settle = useCallback(
    (outcome: PaymentOutcome, details?: SettleDetails): boolean => {
      const attempt = attemptRef.current;
      if (settledAttemptRef.current === attempt) return false;

      const reference = details?.reference ?? null;
      if (reference) {
        if (handledRef.current.has(reference)) return false;
        handledRef.current.add(reference);
      }

      settledAttemptRef.current = attempt;

      const next: PaymentStatusSnapshot = {
        phase: "settled",
        outcome,
        reason: details?.reason?.trim() || null,
        reference,
        amount: details?.amount ?? null,
      };

      const apply = () => {
        timerRef.current = null;
        // A caller that navigated away mid-verify shouldn't set state on an
        // unmounted tree.
        if (!liveRef.current) return;
        setSnapshot(next);
      };

      clearPending();

      // `startedAtRef` is 0 when a failure happens before `start()` — e.g. the
      // order was refused, so there is no payment to narrate. Show it at once
      // rather than inventing a processing step for something that never ran.
      const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : minProcessingMs;
      const wait = Math.max(0, minProcessingMs - elapsed);

      if (wait === 0) apply();
      else timerRef.current = setTimeout(apply, wait);

      return true;
    },
    [clearPending, minProcessingMs],
  );

  const succeed = useCallback(
    (details?: SettleDetails) => settle("success", details),
    [settle],
  );

  const fail = useCallback(
    (outcome: Exclude<PaymentOutcome, "success">, details?: SettleDetails) =>
      settle(outcome, details),
    [settle],
  );

  /** Shorthand for the Razorpay `ondismiss` path. */
  const cancel = useCallback(
    (details?: SettleDetails) => settle("cancelled", details),
    [settle],
  );

  /**
   * Settle from a thrown error / slice message. Pass `afterCapture` when the
   * gateway had already taken the money, so a vague error can't be reported as
   * "nothing was charged".
   */
  const failFrom = useCallback(
    (
      error: unknown,
      options?: { afterCapture?: boolean; reference?: string | null; amount?: number | null },
    ) => {
      const { outcome, reason } = classifyPaymentFailure(error, {
        afterCapture: options?.afterCapture,
      });
      return settle(outcome, {
        reason,
        reference: options?.reference ?? null,
        amount: options?.amount ?? null,
      });
    },
    [settle],
  );

  return useMemo(
    () => ({
      status: snapshot,
      /** True while the processing animation is up. */
      isProcessing: snapshot.phase === "processing",
      /** True whenever the overlay is on screen and owns the viewport. */
      isBlocking: snapshot.phase !== "idle",
      start,
      succeed,
      fail,
      cancel,
      failFrom,
      reset,
    }),
    [snapshot, start, succeed, fail, cancel, failFrom, reset],
  );
}

export type PaymentStatusController = ReturnType<typeof usePaymentStatus>;
