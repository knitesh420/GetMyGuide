/**
 * Vocabulary for the post-payment status experience.
 *
 * Data only (no JSX, no hooks) so it can be imported from anywhere. The visual
 * treatment for each outcome lives in `components/animations/PaymentStatusOverlay`.
 */

/**
 * Every way a payment attempt can end.
 *
 * The split between `failed` and `verification-failed` is the important one: it
 * is the difference between "nothing was charged, try again" and "we have your
 * money but no booking to show for it". Those two need opposite advice, so they
 * are never collapsed into one state.
 */
export type PaymentOutcome =
  | "success"
  | "failed"
  | "cancelled"
  | "network-error"
  | "verification-failed";

export type PaymentPhase = "idle" | "processing" | "settled";

/**
 * Did the money almost certainly leave the customer's account before this
 * failure?
 *
 * This gates the "Retry Payment" button. Offering a retry after a captured
 * payment invites a second charge for a booking the customer has already paid
 * for, which is worse than any amount of dead-end UI — so when this is true the
 * overlay shows the payment reference and a route to support instead.
 */
export const moneyWasCaptured = (outcome: PaymentOutcome | null) =>
  outcome === "verification-failed";

/** True for outcomes where nothing was charged and a retry is safe. */
export const isRetryable = (outcome: PaymentOutcome | null) =>
  outcome === "failed" || outcome === "cancelled" || outcome === "network-error";

// The gateway, our thunks and axios all report failures as prose, so mapping a
// message onto an outcome means matching on it. Callers that *know* the outcome
// should pass it explicitly — this is the fallback for errors that arrive as a
// bare string (e.g. a Redux slice's `error`).
const CANCELLED_PATTERN =
  /\b(cancell?ed|dismissed|closed by (the )?user|payment popup closed)\b/i;
const CAPTURED_PATTERN =
  /(could ?n[o']?t confirm|could not confirm|do not pay again|went through|already (been )?captured|verification failed|signature)/i;
const NETWORK_PATTERN =
  /(network ?error|failed to fetch|load failed|connection|offline|timed? ?out|ECONN|ERR_)/i;

const readMessage = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return candidate.response?.data?.message || candidate.message || "";
  }
  return "";
};

/**
 * Turn whatever a payment step threw into an outcome plus a line the customer
 * can act on.
 *
 * `afterCapture` is the caller telling us the gateway had already taken the
 * money when this failed (i.e. we are inside Razorpay's `handler`). In that case
 * anything other than an explicit cancellation is treated as
 * `verification-failed`, because guessing "failed" there is what makes people
 * pay twice.
 */
export function classifyPaymentFailure(
  error: unknown,
  { afterCapture = false }: { afterCapture?: boolean } = {},
): { outcome: PaymentOutcome; reason: string } {
  const message = readMessage(error).trim();

  if (CANCELLED_PATTERN.test(message)) {
    return { outcome: "cancelled", reason: message };
  }

  if (afterCapture || CAPTURED_PATTERN.test(message)) {
    return {
      outcome: "verification-failed",
      reason: message,
    };
  }

  if (NETWORK_PATTERN.test(message) || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return { outcome: "network-error", reason: message };
  }

  return { outcome: "failed", reason: message };
}
