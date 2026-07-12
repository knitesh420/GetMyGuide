import Link from "next/link";
import { CalendarDays, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminBookingSummary } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatDate } from "./format";

// Mirrors the labels on the My Bookings page so a status doesn't change name
// between the summary and the detail view.
const STATUS_LABEL: Record<string, string> = {
  "payment-pending": "Payment Pending",
  successful: "Booked",
  confirmed: "Confirmed",
  allocated: "Guide Allocated",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "pending" | "success"
> = {
  "payment-pending": "pending",
  successful: "default",
  confirmed: "default",
  allocated: "default",
  completed: "success",
  cancelled: "destructive",
};

function BookingRow({ booking }: { booking: AdminBookingSummary }) {
  return (
    <li className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground">
            {booking.travel_details.city}
          </p>
          <Badge variant={STATUS_VARIANT[booking.status] ?? "outline"}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </Badge>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
            {formatDate(booking.travel_details.date)}
          </span>
          <span className="font-mono text-xs">
            {booking.bookingCode ?? "—"}
          </span>
        </p>
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="shrink-0 self-start sm:self-auto"
      >
        <Link href={`/dashboard/user/my-bookings/${booking._id}`}>
          View Details
          <span className="sr-only">
            {" "}
            for {booking.travel_details.city} on{" "}
            {formatDate(booking.travel_details.date)}
          </span>
        </Link>
      </Button>
    </li>
  );
}

export function RecentBookingsPreview({
  bookings,
}: {
  bookings: AdminBookingSummary[];
}) {
  return (
    <SectionCard
      icon={Ticket}
      title="Recent Bookings"
      description="Your three latest bookings"
      viewAll={{ label: "View All Bookings", href: "/dashboard/user/my-bookings" }}
    >
      {bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="When you book a guided tour it will show up here."
          action={{ label: "Explore Tours", href: "/services" }}
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {bookings.map((booking) => (
            <BookingRow key={booking._id} booking={booking} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
