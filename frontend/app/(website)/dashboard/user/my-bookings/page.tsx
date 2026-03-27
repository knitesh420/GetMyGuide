"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchMyBookings,
  cancelAndRefundBooking,
} from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Calendar,
  MapPin,
  User as UserIcon,
  Undo2,
  Loader2,
  AlertCircle,
  Bell,
} from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function MyBookingCard({
  booking,
  onCancel,
}: {
  booking: Booking;
  onCancel: (bookingId: string, tourTitle: string) => void;
}) {
  const tour =
    booking.tour && typeof booking.tour === "object" ? booking.tour : null;
  const guide =
    booking.guide && typeof booking.guide === "object" ? booking.guide : null;

  if (!tour || !guide) return null;

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

  const isPaymentDue =
    booking.status === "Upcoming" && booking.paymentStatus === "Advance Paid";

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {isPaymentDue && (
        <Alert className="border-t-0 border-l-0 border-r-0 rounded-none bg-amber-50 border-amber-200">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 font-bold">
            Action Required
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            Your remaining payment of{" "}
            <strong>₹{(booking.remainingAmount ?? 0).toLocaleString()}</strong>{" "}
            is due. Please complete the payment to start your tour.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3 relative h-60 md:h-auto flex-shrink-0">
          <Image
            src={tour.images?.[0] || "/placeholder.png"}
            alt={tour.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Booked on {new Date(booking.createdAt).toLocaleDateString()}
              </p>
              <h3 className="font-bold text-2xl mt-1 text-foreground">
                {tour.title}
              </h3>
            </div>
            <Badge
              variant={getStatusVariant(booking.status)}
              className="text-sm px-4 py-1"
            >
              {booking.status}
            </Badge>
          </div>
          <div className="border-t my-4 pt-4 space-y-3 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {new Date(booking.startDate).toLocaleDateString()} -{" "}
                {new Date(booking.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-medium">{tour.locations?.join(", ")}</span>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">
                Guide:{" "}
                <span className="font-bold text-foreground">{guide.name}</span>
              </span>
            </div>
          </div>
          <div className="mt-auto flex justify-between items-end">
            <p className="text-3xl font-extrabold text-primary">
              ₹{booking.totalPrice.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              {booking.status === "Upcoming" && (
                <Button
                  variant="destructive"
                  onClick={() => onCancel(booking._id, tour.title)}
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href={`/dashboard/user/my-bookings/${booking._id}`}>
                  View Details
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
export default function MyBookingsPage() {
  const dispatch = useAppDispatch();
  const { bookings, loading, error } = useAppSelector(
    (state) => state.bookings,
  );

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  const handleCancel = (bookingId: string, tourTitle: string) => {
    if (
      confirm(
        `Are you sure you want to cancel your booking for "${tourTitle}"? Your payment will be refunded.`,
      )
    ) {
      dispatch(cancelAndRefundBooking(bookingId))
        .unwrap()
        .then(() =>
          toast.success("Booking cancelled! Refund has been initiated."),
        )
        .catch((err) => toast.error(err || "Failed to cancel booking."));
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-xl font-semibold">Error loading your bookings</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      );
    }
    if (bookings && bookings.length > 0) {
      return (
        <div className="space-y-8">
          {bookings.map((booking) => (
            <MyBookingCard
              key={booking._id}
              booking={booking}
              onCancel={handleCancel}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="text-center py-16 px-6 bg-card rounded-xl border">
        <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-3xl font-bold mb-2">No Journeys Yet</h2>
        <p className="text-muted-foreground text-lg mb-6">
          You haven't booked any tours.
        </p>
        <Button size="lg" asChild>
          <Link href="/tours">Explore Tours</Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="pt-10">
        <section className="py-10">
          <div className="container max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold">My Bookings</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Review your upcoming adventures and revisit your past journeys.
            </p>
          </div>
        </section>
        <section className="pb-12">
          <div className="container max-w-4xl mx-auto px-4">
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  );
}
