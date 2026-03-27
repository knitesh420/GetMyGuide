// app/dashboard/guide/all-bookings/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchGuideBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin, User as UserIcon, Loader2, AlertCircle } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function GuideBookingCard({ booking }: { booking: Booking }) {
  const tour = typeof booking.tour === "object" ? booking.tour : null;
  const user = typeof booking.user === "object" ? booking.user : null;

  if (!tour || !user) {
    console.log("❌ Missing tour or user data:", { tour, user, booking });
    return null;
  }

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

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
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
                Client: <span className="font-semibold">{user.name}</span>
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
              <span className="font-medium">
                {tour.locations?.join(", ") || "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {booking.numberOfTourists} Tourists
              </span>
            </div>
          </div>
          <div className="mt-auto flex justify-end">
            <Button asChild variant="outline">
              <Link href={`/dashboard/guide/all-bookings/${booking._id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AllGuideBookingsPage() {
  const dispatch = useAppDispatch();
  const { bookings, loading, error } = useAppSelector(
    (state) => state.bookings
  );

  // 🔍 DEBUG: Log the entire state
  console.log("📊 Redux State:", { bookings, loading, error });
  console.log("📊 Bookings Array:", bookings);
  console.log("📊 Bookings Length:", bookings?.length);
  console.log("📊 Bookings type:", typeof bookings);
  console.log("📊 Is Array:", Array.isArray(bookings));
  console.log("📊 Loading:", loading);
  console.log("📊 Error:", error);

  useEffect(() => {
    console.log("🚀 Dispatching fetchGuideBookings...");
    const resultAction = dispatch(fetchGuideBookings());
    resultAction.then((result: any) => {
      console.log("🔥 Thunk result:", result);
      if (result.type.includes("fulfilled")) {
        console.log("✅ Thunk fulfilled with payload:", result.payload);
      } else if (result.type.includes("rejected")) {
        console.log("❌ Thunk rejected:", result.payload || result.error);
      }
    });
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
      console.log("✅ Showing bookings:", bookings.length);
      const validBookings = bookings.filter(Boolean);
      console.log("✅ Valid bookings after filter:", validBookings.length);

      return (
        <div className="space-y-8">
          {validBookings.map((booking) => {
            console.log("🎫 Rendering booking:", booking._id);
            return <GuideBookingCard key={booking._id} booking={booking} />;
          })}
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