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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
    ? new Date(profile.membershipExpiryDate).toLocaleDateString("en-US", {
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
      theme: { color: "#F85E6A" },
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

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="container mx-auto max-w-2xl p-4 md:p-8">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            Guide Membership
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Stay Visible to Travelers
          </h1>
          <p className="mt-3 text-muted-foreground">
            A 30-day membership keeps your profile listed and bookable on Get My Guide.
          </p>
        </div>

        {isActive ? (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-green-600" />
                <div>
                  <CardTitle className="text-green-800">Membership Active</CardTitle>
                  <CardDescription className="text-green-700">
                    Your profile is currently visible to travelers.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Expires on: {expiryDate}</p>
              <Button onClick={handlePay} disabled={processing || loading} className="w-full" size="lg">
                {processing ? "Processing..." : "Renew Early (+30 days)"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>
                    {profile?.membershipStartDate ? "Membership Expired" : "No Active Membership"}
                  </CardTitle>
                  <CardDescription>
                    {profile?.membershipStartDate
                      ? "Your listing is currently hidden from travelers."
                      : "Pay the membership fee to appear in public guide search."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handlePay}
                disabled={processing || loading || !profile?.registrationCompleted}
                className="w-full red-gradient"
                size="lg"
              >
                {processing
                  ? "Processing..."
                  : profile?.membershipStartDate
                    ? "Renew Membership"
                    : "Pay Membership Fee"}
              </Button>
              {!profile?.registrationCompleted && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Complete your guide profile first to pay for membership.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
