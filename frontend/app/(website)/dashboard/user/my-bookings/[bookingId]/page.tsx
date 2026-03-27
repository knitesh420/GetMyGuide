"use client";

import { useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingById,
  cancelAndRefundBooking,
  createRemainingPaymentOrder,
  verifyRemainingPayment,
} from "@/lib/redux/thunks/booking/bookingThunks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  XCircle,
  CheckCircle,
  CreditCard,
  MapPin,
  User as UserIcon,
  Shield,
  AlertCircle,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { bookingId } = params;

  const { currentUser } = useAppSelector((state) => state.user);
  const {
    currentBooking: booking,
    loading,
    error,
  } = useAppSelector((state) => state.bookings);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId as string));
    }
  }, [dispatch, bookingId]);

  const handleRemainingPayment = async () => {
    if (!booking || !currentUser) return;

    try {
      const orderResult = await dispatch(
        createRemainingPaymentOrder(booking._id),
      ).unwrap();
      const order = orderResult;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "BookMyTourGuide",
        description: `Remaining payment for ${
          typeof booking.tour === "object" && booking.tour.title
        }`,
        order_id: order.id,
        handler: function (response: any) {
          dispatch(
            verifyRemainingPayment({
              ...response,
              bookingId: booking._id,
            }),
          );
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.mobile || "",
        },
        theme: { color: "#FF0000" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err: any) {
      toast.error(err.message || "Could not initiate payment.");
    }
  };

  const handleCancelTrip = () => {
    if (!booking) return;
    if (
      confirm("Are you sure you want to cancel? Your payment will be refunded.")
    ) {
      dispatch(cancelAndRefundBooking(booking._id))
        .unwrap()
        .then(() => toast.success("Your trip has been cancelled successfully."))
        .catch((err) => toast.error(err || "Failed to cancel trip."));
    }
  };

  if (loading && !booking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container max-w-2xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error Loading Booking</h2>
        <Button asChild className="mt-6">
          <Link href="/dashboard/user/my-bookings">Go Back</Link>
        </Button>
      </div>
    );
  }
  if (!booking) {
    return <div>hey booking is not here {booking}</div>;
  }

  const tour = typeof booking.tour === "object" ? booking.tour : null;
  const guide = typeof booking.guide === "object" ? booking.guide : null;
  const originalGuide =
    typeof booking.originalGuide === "object" ? booking.originalGuide : null;

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button asChild variant="outline" className="mb-6">
          <Link href="/dashboard/user/my-bookings">Back to My Bookings</Link>
        </Button>
        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-3xl font-extrabold">
                  {tour?.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" /> {tour?.locations?.join(", ")}
                </CardDescription>
              </div>
              <Badge
                variant={
                  booking.status === "Cancelled" ? "destructive" : "default"
                }
                className="text-base"
              >
                {booking.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {booking.status === "Upcoming" &&
              booking.paymentStatus === "Advance Paid" && (
                <Alert className="bg-primary/10 border-primary/20">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertTitle className="font-bold">
                    Complete Your Payment
                  </AlertTitle>
                  <AlertDescription>
                    Your trip is confirmed. Please pay the remaining balance of{" "}
                    <span className="font-bold">
                      ₹{booking.remainingAmount?.toLocaleString()}
                    </span>{" "}
                    to start your tour.
                  </AlertDescription>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Button onClick={handleRemainingPayment} disabled={loading}>
                      <CreditCard className="w-4 h-4 mr-2" /> Pay Remaining
                      Amount
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelTrip}
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancel Trip
                    </Button>
                  </div>
                </Alert>
              )}
            {booking.paymentStatus === "Fully Paid" &&
              booking.status === "Upcoming" && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>All Set!</AlertTitle>
                  <AlertDescription>
                    Your payment is complete. Enjoy your trip!
                  </AlertDescription>
                </Alert>
              )}
            {booking.status === "Cancelled" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Trip Cancelled</AlertTitle>
                <AlertDescription>
                  This booking was cancelled and your payment has been refunded.
                </AlertDescription>
              </Alert>
            )}
            {booking.status === "Completed" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Trip Completed</AlertTitle>
                <AlertDescription>
                  We hope you had an amazing journey!
                </AlertDescription>
              </Alert>
            )}
            <div>
              <h3 className="font-bold text-xl mb-4">Your Assigned Guide</h3>
              <div className="flex items-center gap-4">
                <img
                  src={guide?.photo || "/placeholder.png"}
                  alt={guide?.name || ""}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div>
                  <p className="font-bold text-lg">{guide?.name}</p>
                  <p className="text-sm text-muted-foreground">Main Guide</p>
                  {originalGuide && (
                    <p className="text-xs text-amber-600 mt-1">
                      (Changed from {originalGuide.name})
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
