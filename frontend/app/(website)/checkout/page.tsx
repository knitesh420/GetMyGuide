"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, MapPin, Users, Loader2, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { verifyPaymentAndCreateBooking } from "@/lib/redux/thunks/booking/bookingThunks";
import { clearBookingError } from "@/lib/redux/bookingSlice";
import { createRazorpayOrder } from "@/lib/redux/thunks/booking/bookingThunks";
import { fetchPackageById } from "@/lib/redux/thunks/admin/packageThunks";
import { getGuideById } from "@/lib/redux/thunks/guide/guideThunk";
import { resolvePackageImageUrl } from "@/lib/utils/utils";

import PaymentStatusOverlay from "@/components/animations/PaymentStatusOverlay";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";
import { Shimmer } from "@/components/animations/Skeletons";
import { JourneyProgress } from "@/components/animations/travel";
import { EASE_OUT, staggerParent } from "@/lib/motion";

/** Placeholder that mirrors the two-column checkout while data loads. */
function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {[0, 1].map((col) => (
        <div key={col} className="space-y-6">
          <Shimmer className="h-8 w-64" />
          <div className="rounded-2xl border border-slate-100 bg-white p-6 space-y-4">
            {col === 0 && <Shimmer className="h-48 w-full rounded-xl" />}
            <Shimmer className="h-6 w-2/3" />
            <Shimmer className="h-4 w-1/2" />
            <Shimmer className="h-4 w-1/3" />
            <Shimmer className="h-12 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();

  const tourId = searchParams.get("tourId");
  const guideId = searchParams.get("guideId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const numberOfTourists = searchParams.get("tourists");

  // Use the authenticated user from the auth slice — state.user.currentUser is
  // not populated on normal login, so it would leave a logged-in tourist unable
  // to pay. The backend derives the real user from the session cookie anyway.
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { items: packages, loading: packagesLoading } = useSelector(
    (state: RootState) => state.packages,
  );
  const { guides, loading: guidesLoading } = useSelector(
    (state: RootState) => state.guide,
  );
  const {
    loading: bookingLoading,
    error,
    currentBooking,
  } = useSelector((state: RootState) => state.bookings);

  const tour = packages.find((t) => t._id === tourId);
  const guide = guides.find((g) => g._id === guideId);

  // Presentation-only state for the animated payment experience. `attemptRef`
  // is the duplicate-submit guard: it flips synchronously on click, so a double
  // tap can't open two Razorpay sheets before React re-renders.
  const attemptRef = useRef(false);
  const [verifying, setVerifying] = useState(false);

  // Drives the full-screen processing/success/failure animation. Nothing here
  // touches the payment itself — it only narrates what the flow below already
  // decided, and only once the backend has answered.
  const payment = usePaymentStatus();
  const { start, succeed, fail, failFrom, cancel, reset } = payment;

  // True once this visit has actually tried to pay. Both effects below read the
  // Redux slice, which can still hold a booking or an error from an earlier
  // visit — neither may put a result on screen for a payment that hasn't
  // happened yet.
  const attemptedRef = useRef(false);
  // Set the instant Razorpay hands back a signature: from then on the money is
  // captured, so a failure means "we owe you a booking", not "nothing was
  // charged". Getting this wrong is what makes customers pay twice.
  const capturedRef = useRef(false);
  // Server-derived figures, kept for the success/failure panel.
  const paidAmountRef = useRef<number | null>(null);
  const paymentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (tourId && !tour && packagesLoading !== "pending") {
      dispatch(fetchPackageById(tourId));
    }
  }, [dispatch, tourId, tour, packagesLoading]);

  useEffect(() => {
    if (guideId && !guide && !guidesLoading) {
      dispatch(getGuideById(guideId));
    }
  }, [dispatch, guideId, guide, guidesLoading]);

  // A booking error used to be toasted and cleared immediately; it now drives
  // the failure screen and is cleared when the user acts on it. Clearing on
  // unmount keeps a stale error from re-opening the screen on a later visit.
  useEffect(() => {
    return () => {
      dispatch(clearBookingError());
    };
  }, [dispatch]);

  /** Dismisses the failure screen and re-arms the payment button. */
  const resetAfterFailure = () => {
    attemptRef.current = false;
    capturedRef.current = false;
    setVerifying(false);
    reset();
    dispatch(clearBookingError());
  };

  // Success is announced only once the backend has returned a persisted booking
  // — never on the Razorpay callback alone. The overlay then handles the
  // redirect to the confirmation page, so this no longer navigates directly.
  //
  // `capturedRef` is what keeps this honest across visits: the slice can still
  // hold the booking from an earlier purchase, and without the guard simply
  // opening checkout again would congratulate the user for a payment they
  // haven't made yet.
  useEffect(() => {
    if (!currentBooking?._id || !capturedRef.current) return;
    succeed({
      amount: paidAmountRef.current,
      reference: paymentIdRef.current,
    });
  }, [currentBooking?._id, succeed]);

  // The slice error is the source of truth for a failed verification; mirror it
  // into the overlay, which owns the recovery UI from there.
  useEffect(() => {
    if (!error || !attemptedRef.current) return;
    failFrom(error, {
      afterCapture: capturedRef.current,
      reference: paymentIdRef.current,
      amount: paidAmountRef.current,
    });
  }, [error, failFrom]);

  const handlePayment = async () => {
    // Duplicate-attempt guard — a second click while a sheet is already open
    // would create a second Razorpay order for the same booking.
    if (attemptRef.current) return;

    if (!tour || !guide || !authUser || !numberOfTourists) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing booking details. Please try again.",
      });
      return;
    }

    attemptRef.current = true;
    attemptedRef.current = true;
    capturedRef.current = false;
    // The overlay covers everything from here: order creation, the gateway sheet
    // (which renders above it and stays interactive), then verification.
    start();

    const touristsCount = parseInt(numberOfTourists);

    try {
      // Backend computes the price (package.price x tourists, 20% advance) and
      // returns the Razorpay order plus an encoded booking_data blob.
      const orderResult: any = await dispatch(
        createRazorpayOrder({
          tourId: tourId!,
          guideId: guideId!,
          startDate: startDate!,
          endDate: endDate!,
          tourists: touristsCount,
        }),
      ).unwrap();

      const rzp = orderResult?.razorpay_options;
      const bookingData = orderResult?.booking_data;

      if (!rzp || !rzp.order_id || !bookingData) {
        attemptRef.current = false;
        // Nothing was charged — this is a plain, safely retryable failure.
        fail("failed", { reason: "Could not create payment order." });
        return;
      }

      paidAmountRef.current = rzp.amount != null ? rzp.amount / 100 : null;

      const options = {
        key: rzp.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzp.amount,
        currency: rzp.currency || "INR",
        name: rzp.name || "GetMyGuide",
        description: rzp.description || `Advance for ${tour.title}`,
        order_id: rzp.order_id,
        handler: function (response: any) {
          // Razorpay has taken the money; server-side verification is next —
          // this is the window the processing overlay covers.
          capturedRef.current = true;
          paymentIdRef.current = response.razorpay_payment_id ?? null;
          setVerifying(true);
          start();
          dispatch(
            verifyPaymentAndCreateBooking({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_data: bookingData,
            }),
          );
        },
        // Without this, dismissing the Razorpay sheet would leave the
        // duplicate-attempt guard latched and block any retry.
        modal: {
          ondismiss: function () {
            attemptRef.current = false;
            // Closing the sheet is a deliberate act, not an error — the overlay
            // says so and offers the way back in.
            cancel();
          },
        },
        prefill: rzp.prefill || {
          name: authUser.name,
          email: authUser.email,
          contact: authUser.mobile || authUser.phone || "",
        },
        theme: { color: "#FF0000" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      attemptRef.current = false;
      // Pre-capture: no money has moved, so a retry is safe. `failFrom` still
      // separates a dropped connection from a refused order.
      failFrom(err ?? new Error("Could not initiate payment."));
    }
  };

  if ((!tour && packagesLoading === "pending") || (!guide && guidesLoading)) {
    return <CheckoutSkeleton />;
  }

  if (
    !tourId ||
    !guideId ||
    !startDate ||
    !endDate ||
    !numberOfTourists ||
    !tour ||
    !guide
  ) {
    return (
      <motion.div
        className="text-center py-20"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <h1 className="text-2xl font-bold text-destructive">
          Invalid Booking Information
        </h1>
        <p className="text-muted-foreground">
          Please start your booking again from the tours page.
        </p>
        <Button onClick={() => router.push("/services")} className="mt-4">
          Browse Tours
        </Button>
      </motion.div>
    );
  }

  const touristsCount = parseInt(numberOfTourists);
  const totalCost = tour.price * touristsCount;
  const advanceAmount = totalCost * 0.2;
  const formattedStartDate = new Date(startDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedEndDate = new Date(endDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const summaryRows = [
    { icon: MapPin, content: tour.locations.join(", ") },
    {
      icon: User,
      content: (
        <>
          Guide: <span className="font-bold">{guide.name}</span>
        </>
      ),
    },
    { icon: Users, content: `${touristsCount} Guest${touristsCount > 1 ? "s" : ""}` },
    { icon: Calendar, content: `${formattedStartDate} to ${formattedEndDate}` },
  ];

  return (
    <>
      <PaymentStatusOverlay
        status={payment.status}
        viewHref={
          currentBooking?._id ? `/booking-success?bookingId=${currentBooking._id}` : null
        }
        onRetry={() => {
          resetAfterFailure();
          handlePayment();
        }}
        onDismiss={resetAfterFailure}
        detail={
          <p className="text-xs text-slate-400">
            {tour.title} · {touristsCount} guest{touristsCount > 1 ? "s" : ""}
          </p>
        }
      />

      {/* Journey rail — checkout is the final step before confirmation. */}
      <JourneyProgress
        steps={["Choose Tour", "Pick Guide", "Checkout", "Confirmed"]}
        current={2}
        className="mb-12"
      />

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-12"
        variants={staggerParent(0.12)}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
          }}
        >
          <h2 className="text-3xl font-bold mb-6">Your Booking Summary</h2>
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="relative h-48 w-full rounded-t-lg overflow-hidden group">
                <Image
                  src={resolvePackageImageUrl(tour.images?.[0])}
                  alt={tour.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <CardTitle className="pt-4 text-2xl">{tour.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summaryRows.map((row, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.07, ease: EASE_OUT }}
                >
                  <row.icon className="w-5 h-5 text-primary shrink-0" />
                  <span>{row.content}</span>
                </motion.div>
              ))}
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium">Total Price:</span>
                {/* Keyed so the number cross-fades if the total changes. */}
                <motion.span
                  key={totalCost}
                  className="font-bold"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  ₹{totalCost.toLocaleString()}
                </motion.span>
              </div>
              <div className="flex justify-between items-center text-2xl">
                <span className="font-bold text-primary">
                  Advance Payable (20%):
                </span>
                <motion.span
                  key={advanceAmount}
                  className="font-extrabold text-primary"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  ₹{advanceAmount.toLocaleString()}
                </motion.span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
          }}
        >
          <h2 className="text-3xl font-bold mb-6">Confirm Your Booking</h2>
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Pay Advance to Book</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Pay 20% now to confirm your booking. The remaining balance can be
                paid later.
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  className="w-full text-lg h-14 mt-4 font-bold"
                  onClick={handlePayment}
                  disabled={bookingLoading || verifying}
                >
                  {bookingLoading || verifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      {`Pay ₹${advanceAmount.toLocaleString()} Securely`}
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
