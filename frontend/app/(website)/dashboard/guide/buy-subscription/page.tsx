// app/(website)/dashboard/guide/buy-subscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AppDispatch, RootState } from "@/lib/store";
import {
  getMyGuideProfile,
  createGuideMembershipOrder,
  confirmGuideMembershipPayment,
} from "@/lib/redux/thunks/guide/guideThunk";
import { Button } from "@/components/ui/button";
import { CalendarClock, ShieldCheck, AlertTriangle, Eye, Hourglass } from "lucide-react";
import {
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatStrip,
} from "@/components/guide";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Matches the guide panel's green accent rather than the app's red brand. */
const RAZORPAY_THEME_COLOR = "#22C55E";

export default function GuideMembershipPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myProfile: profile, loading } = useSelector((state: RootState) => state.guide);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    dispatch(getMyGuideProfile());
  }, [dispatch]);

  const isActive =
    profile?.isVisible && !profile?.membershipExpired && !!profile?.membershipExpiryDate;
  /**
   * Paid, but the 30-day clock has not started: the guide is waiting on the
   * admin's verification, and their subscription begins the moment it lands.
   *
   * Without this the page cannot tell "has not paid" from "paid and waiting" —
   * both have no expiry date — and would push a guide who has already paid to
   * pay a second time.
   */
  const awaitingApproval = !!profile?.membershipPendingActivation;
  const expiryDate = profile?.membershipExpiryDate
    ? new Date(profile.membershipExpiryDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const paidOn = profile?.membershipPaidAt
    ? new Date(profile.membershipPaidAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handlePay = async () => {
    if (!profile?.registrationCompleted) {
      toast.error("Please complete your guide profile before paying for membership.");
      return;
    }

    setProcessing(true);
    const orderResult = await dispatch(createGuideMembershipOrder());
    if (createGuideMembershipOrder.rejected.match(orderResult)) {
      toast.error((orderResult.payload as string) || "Failed to start payment.");
      setProcessing(false);
      return;
    }

    const { transaction_id, razorpay_options } = orderResult.payload;

    const options = {
      key: razorpay_options.key,
      amount: razorpay_options.amount,
      currency: razorpay_options.currency,
      name: razorpay_options.name,
      description: razorpay_options.description,
      order_id: razorpay_options.order_id,
      prefill: razorpay_options.prefill,
      theme: { color: RAZORPAY_THEME_COLOR },
      handler: async (response: any) => {
        const confirmResult = await dispatch(
          confirmGuideMembershipPayment({
            transaction_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        );

        if (confirmGuideMembershipPayment.fulfilled.match(confirmResult)) {
          // Paying does not necessarily list them any more: an unverified guide's
          // 30 days start when an admin approves, not now. Promising visibility
          // here would be a lie for exactly the guides who most need the truth.
          toast.success(
            profile?.approvalStatus === "approved"
              ? "Membership payment confirmed! You're now visible to travellers."
              : "Payment received. Your 30-day subscription will start as soon as our team verifies your documents.",
          );
          dispatch(getMyGuideProfile());
        } else {
          toast.error(
            (confirmResult.payload as string) ||
              "Payment succeeded but confirmation failed — please contact support.",
          );
        }
        setProcessing(false);
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response: any) => {
      toast.error(`Payment failed: ${response.error?.description || "please try again"}`);
      setProcessing(false);
    });
    rzp.open();
  };

  const ctaLabel = processing
    ? "Processing..."
    : isActive
      ? "Renew Early (+30 days)"
      : awaitingApproval
        ? "Awaiting Verification"
        : profile?.membershipStartDate
          ? "Renew Membership"
          : "Pay Membership Fee";

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />

      <div className="space-y-6">
        <GuidePageHeader
          title="Guide Membership"
          description="A 30-day membership keeps your profile listed and bookable on Get My Guide."
        />

        <GuidePanel>
          <div className="border-b border-slate-200 px-5 py-4">
            <GuideStatStrip>
              <GuideStat
                icon={Eye}
                label="Listing Status"
                value={isActive ? "Visible" : "Hidden"}
                accent={!!isActive}
              />
              <GuideStat
                icon={CalendarClock}
                label={
                  isActive ? "Expires On" : awaitingApproval ? "Fee Paid On" : "Expired On"
                }
                value={(awaitingApproval ? paidOn : expiryDate) ?? "—"}
              />
              <GuideStat
                icon={ShieldCheck}
                label="Profile"
                value={profile?.registrationCompleted ? "Complete" : "Incomplete"}
              />
            </GuideStatStrip>
          </div>

          <div className="p-5">
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                isActive
                  ? "border-green-200 bg-green-50/60"
                  : awaitingApproval
                    ? "border-blue-200 bg-blue-50/60"
                    : "border-amber-200 bg-amber-50/60"
              }`}
            >
              {isActive ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : awaitingApproval ? (
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    isActive
                      ? "text-green-900"
                      : awaitingApproval
                        ? "text-blue-900"
                        : "text-amber-900"
                  }`}
                >
                  {isActive
                    ? "Membership active"
                    : awaitingApproval
                      ? "Payment received — awaiting verification"
                      : profile?.membershipStartDate
                        ? "Membership expired"
                        : "No active membership"}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isActive
                      ? "text-green-800/80"
                      : awaitingApproval
                        ? "text-blue-800/80"
                        : "text-amber-800/80"
                  }`}
                >
                  {isActive
                    ? "Your profile is currently visible to travellers."
                    : awaitingApproval
                      ? "Your membership fee is paid. Our team is checking your documents — your 30 days start the moment you're approved, so nothing is lost while you wait. There is nothing more to pay."
                      : profile?.membershipStartDate
                        ? "Your listing is currently hidden from travellers."
                        : "Pay the membership fee to appear in public guide search."}
                </p>
              </div>
            </div>

            {profile?.membershipRefund?.status === "processed" && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Membership fee refunded.</span> We refunded ₹
                {profile.membershipRefund.amount.toLocaleString("en-IN")} on{" "}
                {new Date(profile.membershipRefund.refundedAt).toLocaleDateString("en-IN")}. It
                usually reaches your account within 5–7 working days.
              </div>
            )}

            <Button
              onClick={handlePay}
              // An awaiting-verification guide has already paid: taking their money
              // again is the one thing this page must never do.
              disabled={
                processing || loading || !profile?.registrationCompleted || awaitingApproval
              }
              className="mt-5 w-full"
              size="lg"
            >
              {ctaLabel}
            </Button>

            {!profile?.registrationCompleted && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Complete your guide profile first to pay for membership.
              </p>
            )}
            {awaitingApproval && (
              <p className="mt-2 text-center text-xs text-slate-500">
                No further payment is needed. We&apos;ll email you when your profile is verified.
              </p>
            )}
          </div>
        </GuidePanel>
      </div>
    </>
  );
}
