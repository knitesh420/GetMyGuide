// app/dashboard/guide/all-bookings/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchGuideBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Calendar,
  MapPin,
  User as UserIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function GuideBookingCard({ booking }: { booking: AdminBookingSummary }) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "allocated":
      case "confirmed":
      case "successful":
        return "default";
      case "payment-pending":
        return "destructive";
      default:
        return "outline";
    }
  };

  const customerName = booking.tourist_info.name;
  const bookingDate = booking.travel_details.date;
  const bookingLocation = booking.travel_details.city;
  const bookingPlaces = booking.travel_details.places?.join(", ") || "N/A";
  const travelCount = booking.travel_details.no_of_person;

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Customer: <span className="font-semibold">{customerName}</span>
            </p>
            <h3 className="font-bold text-2xl mt-1 text-foreground">
              {bookingLocation}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {bookingPlaces}
            </p>
          </div>
          <Badge
            variant={getStatusVariant(booking.status)}
            className="text-sm px-4 py-1"
          >
            {booking.status}
          </Badge>
        </div>

        <div className="grid gap-3 text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{new Date(bookingDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{bookingLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" />
            <span>
              {travelCount} Traveler{travelCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button asChild variant="outline">
            <Link href={`/dashboard/guide/all-bookings/${booking._id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AllGuideBookingsPage() {
  const dispatch = useAppDispatch();
  const { bookings, loading, error } = useAppSelector(
    (state) => state.bookings,
  );

  useEffect(() => {
    dispatch(fetchGuideBookings());
  }, [dispatch]);

  const renderContent = () => {
    console.log("🎨 Rendering content...", {
      loading,
      error,
      bookingsLength: bookings?.length,
    });

    if (loading) {
      console.log("⏳ Showing loading state");
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      console.log("❌ Showing error state:", error);
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-xl font-semibold">Error Loading Bookings</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (bookings && bookings.length > 0) {
      return (
        <div className="space-y-8">
          {bookings.map((booking) => (
            <GuideBookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      );
    }

    console.log("📭 Showing no bookings state");
    return (
      <div className="text-center py-16 px-6 bg-card rounded-xl border">
        <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-3xl font-bold mb-2">No Bookings Found</h2>
        <p className="text-muted-foreground text-lg mb-6">
          You have not been assigned to any tours yet.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="pt-10">
        <section className="py-10">
          <div className="container max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold">
              All My Bookings
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              A complete list of all tours you are assigned to.
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
