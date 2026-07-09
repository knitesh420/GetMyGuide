"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchBookingById } from "@/lib/redux/thunks/booking/bookingThunks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Languages,
  Loader2,
  MapPin,
  ReceiptText,
  User as UserIcon,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";

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

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || "N/A"}</p>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const bookingId = params.bookingId as string | undefined;

  const { currentBooking, loading, error } = useAppSelector(
    (state) => state.bookings,
  );

  const booking = currentBooking;

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

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
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/user/my-bookings">Go Back</Link>
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Booking not found.
      </div>
    );
  }

  const languages = booking.guide_preferences.guide_language;
  const outstation = booking.booking_configuration.outstation;

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
                  {booking.travel_details.city}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" />
                  {booking.travel_details.places.join(", ")}
                </CardDescription>
              </div>
              <Badge
                variant={getStatusVariant(booking.status)}
                className="text-base whitespace-nowrap"
              >
                {statusLabel[booking.status] || booking.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <Alert className="bg-primary/10 border-primary/20">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="font-bold">Booking Received</AlertTitle>
              <AlertDescription>
                Your custom tour guide request has been recorded. Our team will
                use these details to coordinate the guide assignment.
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-2">
              <DetailItem
                icon={Calendar}
                label="Travel Date"
                value={new Date(
                  booking.travel_details.date,
                ).toLocaleDateString()}
              />
              <DetailItem
                icon={UserIcon}
                label="Travelers"
                value={booking.travel_details.no_of_person}
              />
              <DetailItem
                icon={Languages}
                label="Preferred Languages"
                value={
                  languages.length ? languages.join(", ") : "No preference"
                }
              />
              <DetailItem
                icon={ReceiptText}
                label="Transaction ID"
                value={booking.transaction_id}
              />
            </div>

            <div>
              <h3 className="font-bold text-xl mb-4">Traveler Information</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-semibold">
                    {booking.tourist_info.name}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-semibold">
                    {booking.tourist_info.email}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span>{" "}
                  <span className="font-semibold">
                    {booking.tourist_info.phone}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Country:</span>{" "}
                  <span className="font-semibold">
                    {booking.tourist_info.country}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl mb-4">Booking Configuration</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Duration:</span>{" "}
                  <span className="font-semibold">
                    {booking.booking_configuration.duration}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total Fee:</span>{" "}
                  <span className="font-semibold">
                    Rs. {booking.booking_configuration.price.toLocaleString()}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Hotel:</span>{" "}
                  <span className="font-semibold">
                    {booking.travel_details.preferences.hotel ? "Yes" : "No"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Taxi:</span>{" "}
                  <span className="font-semibold">
                    {booking.travel_details.preferences.taxi ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            </div>

            {outstation && (
              <div>
                <h3 className="font-bold text-xl mb-4">Outstation Details</h3>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Distance:</span>{" "}
                    <span className="font-semibold">
                      {outstation.distance} km
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Overnight Stay:
                    </span>{" "}
                    <span className="font-semibold">
                      {outstation.over_night_stay} night(s)
                    </span>
                  </p>
                  <p className="md:col-span-2">
                    <span className="text-muted-foreground">Excursions:</span>{" "}
                    <span className="font-semibold">
                      {outstation.special_excursion.length
                        ? outstation.special_excursion.join(", ")
                        : "None"}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
