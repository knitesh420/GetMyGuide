"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchMyBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  Languages,
  Loader2,
  MapPin,
  ReceiptText,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const statusLabel: Record<string, string> = {
  "payment-pending": "Payment Pending",
  successful: "Booked",
  confirmed: "Confirmed",
  allocated: "Guide Allocated",
  completed: "Completed",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "successful":
    case "confirmed":
    case "allocated":
      return "default";
    case "completed":
      return "secondary";
    case "payment-pending":
      return "destructive";
    default:
      return "outline";
  }
}

function MyBookingCard({ booking }: { booking: AdminBookingSummary }) {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col p-6">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Booked on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
            <h3 className="font-bold text-2xl mt-1 text-foreground">
              {booking.travel_details.city}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Booking ID: {booking.bookingCode ?? "—"}
            </p>
          </div>
          <Badge
            variant={getStatusVariant(booking.status)}
            className="text-sm px-4 py-1 whitespace-nowrap"
          >
            {statusLabel[booking.status] || booking.status}
          </Badge>
        </div>

        <div className="border-t my-4 pt-4 space-y-3 text-muted-foreground">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {new Date(booking.travel_details.date).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {booking.travel_details.places.join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {booking.travel_details.no_of_person} traveler
              {booking.travel_details.no_of_person === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Languages className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {booking.guide_preferences.guide_language.length
                ? booking.guide_preferences.guide_language.join(", ")
                : "No language preference"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-3xl font-extrabold text-primary">
            Rs. {booking.booking_configuration.price.toLocaleString()}
          </p>
          <Button asChild variant="outline">
            <Link href={`/dashboard/user/my-bookings/${booking._id}`}>
              <ReceiptText className="w-4 h-4 mr-2" />
              View Details
            </Link>
          </Button>
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

    if (bookings.length > 0) {
      return (
        <div className="space-y-8">
          {bookings.map((booking) => (
            <MyBookingCard key={booking._id} booking={booking} />
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
          <Link href="/services">Explore Tours</Link>
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
