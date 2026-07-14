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
  MapPin,
  ReceiptText,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/tourist/EmptyState";
import { formatCurrency, formatDate } from "@/components/dashboard/tourist/format";
import {
  CARD,
  PAGE,
  PAGE_SUBTITLE,
  PAGE_TITLE,
} from "@/components/dashboard/tourist/ui";

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

/** One booking fact — icon, label, value — so every row lines up on one grid. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium leading-relaxed text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function MyBookingCard({ booking }: { booking: AdminBookingSummary }) {
  const { travel_details, guide_preferences, booking_configuration } = booking;

  return (
    // h-full + flex so two cards sharing a grid row come out the same height and
    // their prices sit on the same baseline.
    <Card className={`${CARD} flex h-full flex-col gap-0 p-6 lg:p-8`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-gray-500">
            Booked on {formatDate(booking.createdAt)}
          </p>
          <h2 className="truncate text-xl font-semibold text-gray-900">
            {travel_details.city}
          </h2>
          <p className="truncate font-mono text-xs text-gray-500">
            {booking.bookingCode ?? "—"}
          </p>
        </div>
        <Badge
          variant={getStatusVariant(booking.status)}
          className="shrink-0 whitespace-nowrap"
        >
          {statusLabel[booking.status] || booking.status}
        </Badge>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
        <Fact
          icon={Calendar}
          label="Travel date"
          value={formatDate(travel_details.date)}
        />
        <Fact
          icon={UserIcon}
          label="Travellers"
          value={`${travel_details.no_of_person} traveler${
            travel_details.no_of_person === 1 ? "" : "s"
          }`}
        />
        <Fact
          icon={MapPin}
          label="Places"
          value={travel_details.places.join(", ")}
        />
        <Fact
          icon={Languages}
          label="Languages"
          value={
            guide_preferences.guide_language.length
              ? guide_preferences.guide_language.join(", ")
              : "No language preference"
          }
        />
      </dl>

      {/* mt-auto pins the price row to the bottom of the tallest card in the row. */}
      <div className="mt-auto flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            {formatCurrency(booking_configuration.price)}
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-lg border-gray-200 text-gray-700 hover:bg-teal-500/10 hover:text-teal-700"
        >
          <Link href={`/dashboard/user/my-bookings/${booking._id}`}>
            <ReceiptText aria-hidden="true" className="mr-1.5 h-4 w-4" />
            View Details
            <span className="sr-only"> for {travel_details.city}</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}

/** Matches MyBookingCard's shape so the grid doesn't jump when bookings land. */
function BookingCardSkeleton() {
  return (
    <Card className={`${CARD} flex h-full flex-col gap-0 p-6 lg:p-8`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-24 rounded-md" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-5 border-t border-gray-200 pt-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-32 rounded-lg" />
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
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="grid gap-6 lg:gap-8 xl:grid-cols-2"
        >
          <span className="sr-only">Loading your bookings…</span>
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      );
    }

    if (error) {
      return (
        <Card className={`${CARD} p-6 lg:p-8`}>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle
              aria-hidden="true"
              className="h-12 w-12 text-red-600"
            />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold text-gray-900">
                Could not load your bookings
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">
                {error}
              </p>
            </div>
            <Button
              className="mt-2 h-10 rounded-lg px-5"
              onClick={() => dispatch(fetchMyBookings())}
            >
              Try again
            </Button>
          </div>
        </Card>
      );
    }

    if (bookings.length === 0) {
      return (
        <Card className={CARD}>
          <EmptyState
            icon={Ticket}
            title="No bookings yet"
            description="You haven't booked any tours. Explore our packages and plan your first journey with a certified local guide."
            action={{ label: "Explore Tours", href: "/services" }}
          />
        </Card>
      );
    }

    return (
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-2">
        {bookings.map((booking) => (
          <MyBookingCard key={booking._id} booking={booking} />
        ))}
      </div>
    );
  };

  return (
    <div className={PAGE}>
      <div>
        <h1 className={PAGE_TITLE}>My Bookings</h1>
        <p className={PAGE_SUBTITLE}>
          Review your upcoming adventures and revisit your past journeys.
        </p>
      </div>

      {renderContent()}
    </div>
  );
}
