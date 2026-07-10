"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, MapPin, Users, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { verifyPaymentAndCreateBooking } from "@/lib/redux/thunks/booking/bookingThunks";
import { clearBookingError } from "@/lib/redux/bookingSlice";
import { createRazorpayOrder } from "@/lib/redux/thunks/booking/bookingThunks";
import { fetchPackageById } from "@/lib/redux/thunks/admin/packageThunks";
import { getGuideById } from "@/lib/redux/thunks/guide/guideThunk";
import { resolvePackageImageUrl } from "@/lib/utils/utils";

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

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error,
      });
      dispatch(clearBookingError());
    }
  }, [error, dispatch, toast]);

  useEffect(() => {
    if (currentBooking?._id) {
      router.push(`/booking-success?bookingId=${currentBooking._id}`);
    }
  }, [currentBooking, router]);

  const handlePayment = async () => {
    if (!tour || !guide || !authUser || !numberOfTourists) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing booking details. Please try again.",
      });
      return;
    }

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
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: "Could not create payment order.",
        });
        return;
      }

      const options = {
        key: rzp.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzp.amount,
        currency: rzp.currency || "INR",
        name: rzp.name || "GetMyGuide",
        description: rzp.description || `Advance for ${tour.title}`,
        order_id: rzp.order_id,
        handler: function (response: any) {
          dispatch(
            verifyPaymentAndCreateBooking({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_data: bookingData,
            }),
          );
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
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: err.message || "Could not initiate payment.",
      });
    }
  };

  if ((!tour && packagesLoading === "pending") || (!guide && guidesLoading)) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-destructive">
          Invalid Booking Information
        </h1>
        <p className="text-muted-foreground">
          Please start your booking again from the tours page.
        </p>
        <Button onClick={() => router.push("/services")} className="mt-4">
          Browse Tours
        </Button>
      </div>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>
        <h2 className="text-3xl font-bold mb-6">Your Booking Summary</h2>
        <Card>
          <CardHeader>
            <div className="relative h-48 w-full rounded-t-lg overflow-hidden">
              <Image
                src={resolvePackageImageUrl(tour.images?.[0])}
                alt={tour.title}
                fill
                className="object-cover"
              />
            </div>
            <CardTitle className="pt-4 text-2xl">{tour.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5" />
              <span>{tour.locations.join(", ")}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" />
              <span>
                Guide: <span className="font-bold">{guide.name}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span>
                {touristsCount} Guest{touristsCount > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              <span>{`${formattedStartDate} to ${formattedEndDate}`}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total Price:</span>
              <span className="font-bold">₹{totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-2xl">
              <span className="font-bold text-primary">
                Advance Payable (20%):
              </span>
              <span className="font-extrabold text-primary">
                ₹{advanceAmount.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-6">Confirm Your Booking</h2>
        <Card>
          <CardHeader>
            <CardTitle>Pay Advance to Book</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Pay 20% now to confirm your booking. The remaining balance can be
              paid later.
            </p>
            <Button
              size="lg"
              className="w-full text-lg h-14 mt-4 font-bold"
              onClick={handlePayment}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                  Processing...
                </>
              ) : (
                `Pay ₹${advanceAmount.toLocaleString()} Securely`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Suspense
          fallback={
            <div className="flex justify-center items-center py-40">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}
