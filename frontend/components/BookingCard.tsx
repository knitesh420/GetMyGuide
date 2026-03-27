// components/BookingCard.tsx

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, MapPin } from "lucide-react";
import type { Booking, Tour, Guide, BookingStatus } from "@/lib/data";

interface BookingCardProps {
  booking: Booking;
  tour: Tour;
  guide: Guide;
}

// Helper function to determine badge color based on status
const getStatusVariant = (status: BookingStatus): "default" | "secondary" | "destructive" => {
    switch (status) {
        case "Upcoming":
            return "default"; // Will use the primary red color
        case "Completed":
            return "secondary";
        case "Cancelled":
            return "destructive";
        default:
            return "secondary";
    }
};

export function BookingCard({ booking, tour, guide }: BookingCardProps) {
  if (!tour || !guide) return null; // Failsafe in case of missing data

  const formattedStartDate = new Date(booking.startDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedEndDate = new Date(booking.endDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl border-border/60">
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* Image Column */}
        <div className="relative h-48 md:h-full w-full">
          <Image
            src={tour.images[0]}
            alt={tour.title}
            fill
            className="object-cover"
          />
        </div>

        {/* Details Column */}
        <div className="md:col-span-2 p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Booked on {new Date(booking.bookingDate).toLocaleDateString()}</p>
              <h3 className="text-2xl font-bold text-foreground line-clamp-2">{tour.title}</h3>
            </div>
            <Badge variant={getStatusVariant(booking.status)} className="text-sm px-3 py-1">
              {booking.status}
            </Badge>
          </div>
          
          <Separator className="my-4" />

          <div className="space-y-3 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <span>{formattedStartDate} - {formattedEndDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <span>{tour.locations.join(', ')}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <span>Guide: <span className="font-semibold text-foreground">{guide.name}</span></span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <span className="text-2xl font-extrabold text-primary">₹{booking.totalPrice.toLocaleString()}</span>
            <Button asChild variant="outline">
              <Link href={`/tours/${tour._id}`}>View Tour Details</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}