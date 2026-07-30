"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { toast } from "react-toastify";
import { AlertTriangle, CreditCard, XCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { requestCancellation } from "@/lib/redux/thunks/refund/refundThunks";
import { apiService } from "@/lib/service/api";
import { Button } from "@/components/ui/button";
import PaymentStatusOverlay from "@/components/animations/PaymentStatusOverlay";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Once a booking reaches one of these, there is nothing left to cancel. */
const UNCANCELLABLE = ["cancelled", "completed"];

interface BalanceOrder {
  booking_id: string;
  amount_due: number;
  razorpay_options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    prefill: { name: string; email: string; contact: string };
  };
}

/**
 * The two things a tourist can do to a live booking: settle what they still owe,
 * and ask to get out of it.
 *
 * Cancelling does NOT cancel. It opens a request an admin reviews and decides
 * the refund on — so the copy here has to be honest about that, or the tourist
 * will assume the trip is off and stop turning up.
 */
export function BookingActions({
  bookingId,
  status,
  balanceDue,
  onChanged,
}: {
  bookingId: string;
  status: string;
  balanceDue?: number;
  /** Called after a successful balance payment or cancellation request. */
  onChanged?: () => void;
}) {
  const dispatch = useAppDispatch();
  const { deciding } = useAppSelector((state) => state.refunds);

  const [paying, setPaying] = useState(false);
  // Full-screen animation for the balance payment. Reporting only — the calls
  // below are unchanged.
  const balancePayment = usePaymentStatus();
  const { start, succeed, fail, failFrom, cancel, reset } = balancePayment;
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState(false);

  // A refund request opened in an earlier session should still show as pending
  // here, so re-check on mount rather than trusting local state alone.
  useEffect(() => {
    let cancelled = false;

    apiService
      .get<{ data: { booking: { _id: string } | string; status: string }[] }>("/refund/my")
      .then((response) => {
        if (cancelled) return;
        const mine = response.data?.data ?? [];
        const open = mine.some((request) => {
          const id =
            typeof request.booking === "string" ? request.booking : request.booking?._id;
          return id === bookingId && request.status === "pending";
        });
        setPendingRequest(open);
      })
      .catch(() => {
        // A failed check just means we show the button; the backend rejects a
        // duplicate request anyway, so this is not worth surfacing.
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const hasBalance = (balanceDue ?? 0) > 0;
  const canCancel = !UNCANCELLABLE.includes(status) && !pendingRequest;

  const handlePayBalance = async () => {
    setPaying(true);
    start();
    try {
      const response = await apiService.post<BalanceOrder>(
        `/booking/${bookingId}/balance/create-order`,
      );
      const order = response.data;
      if (!order?.razorpay_options?.order_id) {
        throw new Error("Could not start the payment.");
      }

      const options = {
        key: order.razorpay_options.key,
        amount: order.razorpay_options.amount,
        currency: order.razorpay_options.currency,
        name: "GetMyGuide",
        description: `Balance payment for your booking`,
        order_id: order.razorpay_options.order_id,
        prefill: order.razorpay_options.prefill,
        theme: { color: "#0d9488" },
        handler: async (rzp: any) => {
          // Money is captured from here on, so a verification failure is never
          // reported as "payment failed" — that is what makes people pay twice.
          start();
          try {
            await apiService.post(`/booking/${bookingId}/balance/verify`, {
              razorpay_order_id: rzp.razorpay_order_id,
              razorpay_payment_id: rzp.razorpay_payment_id,
              razorpay_signature: rzp.razorpay_signature,
            });
            // Refresh underneath, so the booking is already up to date when the
            // overlay closes.
            onChanged?.();
            succeed({
              amount: order.amount_due ?? balanceDue ?? null,
              reference: rzp.razorpay_payment_id,
            });
          } catch (error: any) {
            fail("verification-failed", {
              reason:
                error.response?.data?.message ||
                "We could not confirm the payment. Do not pay again — contact support.",
              reference: rzp.razorpay_payment_id,
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            cancel();
          },
        },
      };

      new window.Razorpay(options).open();
    } catch (error: any) {
      // Pre-capture — nothing was charged, so the overlay offers a retry.
      failFrom(error);
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (reason.trim().length < 5) {
      toast.error("Tell us briefly why you need to cancel.");
      return;
    }

    const result = await dispatch(requestCancellation({ bookingId, reason: reason.trim() }));

    if (requestCancellation.fulfilled.match(result)) {
      toast.success("Your cancellation request has been sent for review.");
      setPendingRequest(true);
      setShowCancel(false);
      setReason("");
      onChanged?.();
    } else {
      toast.error((result.payload as string) || "Could not submit your request.");
    }
  };

  // Rendered outside the section below because a successful balance payment can
  // remove that section (the balance is gone) while the animation is still on
  // screen — it has to outlive what it belongs to.
  const statusOverlay = (
    <PaymentStatusOverlay
      status={balancePayment.status}
      // Already on the booking, so "View Booking" just closes the overlay onto
      // the refreshed page rather than navigating somewhere identical.
      viewHref={null}
      dashboardHref="/dashboard/user"
      onRetry={handlePayBalance}
      onDismiss={reset}
    />
  );

  if (UNCANCELLABLE.includes(status) && !hasBalance) {
    return statusOverlay;
  }

  return (
    <>
      {statusOverlay}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Manage this booking</h2>

        {hasBalance && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3">
            <div className="text-sm text-amber-900">
              <p className="font-semibold">
                {currency.format(balanceDue!)} still to pay
              </p>
              <p className="text-xs">
                Settle the balance before your trip so your guide is confirmed.
              </p>
            </div>
            <Button onClick={handlePayBalance} disabled={paying}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              {paying ? "Opening…" : "Pay balance"}
            </Button>
          </div>
        )}

        {pendingRequest && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>
              Your cancellation request is with our team. Your booking is still live until they
              decide, so please don&apos;t make other plans yet — we&apos;ll email you.
            </p>
          </div>
        )}

        {canCancel &&
          (showCancel ? (
            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                We&apos;ll review your request and decide the refund. Your booking stays live
                until then.
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Why do you need to cancel?
                </span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                  placeholder="e.g. My flight was cancelled and I can no longer travel on these dates."
                />
              </label>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={deciding} onClick={handleCancel}>
                  {deciding ? "Sending…" : "Send request"}
                </Button>
                <Button variant="ghost" onClick={() => setShowCancel(false)}>
                  Keep my booking
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowCancel(true)}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Request cancellation
            </Button>
          ))}
      </section>
    </>
  );
}
