// app/dashboard/guide/all-bookings/[bookingId]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchBookingById } from "@/lib/redux/thunks/booking/bookingThunks";
import type { BookingStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  Calendar,
  CreditCard,
  Users,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowLeft,
  IndianRupee,
} from "lucide-react";
import { resolvePackageImageUrl } from "@/lib/utils/utils";

const getStatusVariant = (status: BookingStatus) => {
  switch (status) {
    case "Upcoming":
      return "default";
    case "Completed":
      return "secondary";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

export default function GuideBookingDetailsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { bookingId } = params;

  const {
    currentBooking: booking,
    loading,
    error,
  } = useAppSelector((state) => state.bookings);

  useEffect(() => {
    if (bookingId) {
      console.log("🔍 Fetching booking details for ID:", bookingId);
      dispatch(fetchBookingById(bookingId as string));
    }
  }, [dispatch, bookingId]);

  const handleCancel = () => {
    if (!booking) return;

    const tour = typeof booking.tour === "object" ? booking.tour : null;
    const tourTitle = tour?.title || "this booking";

    if (
      confirm(
        `Are you sure you want to cancel "${tourTitle}"? The customer's advance amount will be refunded.`,
      )
    ) {
      dispatch(cancelAndRefundBooking(booking._id))
        .unwrap()
        .then(() => {
          toast.success("Booking cancelled and refund initiated successfully!");
        })
        .catch((err) => {
          toast.error(err || "Failed to cancel booking.");
        });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Booking not found</h2>
        <p className="text-muted-foreground mt-2">
          The booking you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const tour = typeof booking.tour === "object" ? booking.tour : null;
  const user = typeof booking.user === "object" ? booking.user : null;

  if (!tour || !user) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Incomplete Data</h2>
        <p className="text-muted-foreground mt-2">
          Tour or user information is missing.
        </p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/guide/all-bookings")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Bookings
        </Button>

        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
              {tour.title}
            </h1>
            <p className="text-muted-foreground">Booking ID: {booking._id}</p>
          </div>
          <Badge
            variant={getStatusVariant(booking.status)}
            className="text-md px-4 py-2 w-fit"
          >
            {booking.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Tour Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tour Image */}
            <Card>
              <CardContent className="p-0">
                <div className="relative w-full h-80 rounded-lg overflow-hidden">
                  <Image
                    src={resolvePackageImageUrl(tour.images?.[0])}
                    alt={tour.title || "Tour"}
                    fill
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tour Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Tour Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(booking.startDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold">
                    {new Date(booking.endDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Number of Tourists
                  </p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    {booking.numberOfTourists}{" "}
                    {booking.numberOfTourists === 1 ? "Tourist" : "Tourists"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location(s)</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {tour.locations?.join(", ") || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{booking.totalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Advance Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{booking.advanceAmount.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Payment Status
                  </p>
                  <Badge variant="outline" className="text-sm">
                    {booking.paymentStatus}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="text-sm font-mono flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {booking.paymentId}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user.name}</p>
                    <p className="text-sm text-muted-foreground">Customer</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm">{user.email}</p>
                    </div>
                  </div>

                  {user.mobile && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                        <p className="text-sm">{user.mobile}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.mobile ? (
                  <Button className="w-full" variant="outline" asChild>
                    <a href={`tel:${user.mobile}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Call Customer
                    </a>
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Phone className="w-4 h-4 mr-2" />
                    Customer Mobile Not Available
                  </Button>
                )}
                {booking.status === "Upcoming" && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Cancel & Refund Booking
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Booking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {new Date(booking.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
