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
import { CalendarClock, ShieldCheck, AlertTriangle, Eye } from "lucide-react";
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
  const expiryDate = profile?.membershipExpiryDate
    ? new Date(profile.membershipExpiryDate).toLocaleDateString("en-IN", {
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
          toast.success("Membership payment confirmed! You're now visible to travelers.");
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
                label={isActive ? "Expires On" : "Expired On"}
                value={expiryDate ?? "—"}
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
                  : "border-amber-200 bg-amber-50/60"
              }`}
            >
              {isActive ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    isActive ? "text-green-900" : "text-amber-900"
                  }`}
                >
                  {isActive
                    ? "Membership active"
                    : profile?.membershipStartDate
                      ? "Membership expired"
                      : "No active membership"}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isActive ? "text-green-800/80" : "text-amber-800/80"
                  }`}
                >
                  {isActive
                    ? "Your profile is currently visible to travellers."
                    : profile?.membershipStartDate
                      ? "Your listing is currently hidden from travellers."
                      : "Pay the membership fee to appear in public guide search."}
                </p>
              </div>
            </div>

            <Button
              onClick={handlePay}
              disabled={processing || loading || !profile?.registrationCompleted}
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
          </div>
        </GuidePanel>
      </div>
    </>
  );
}
