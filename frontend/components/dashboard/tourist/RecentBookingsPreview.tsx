import Link from "next/link";
import { CalendarDays, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminBookingSummary } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatDate } from "./format";
import { ROW_PADDING } from "./ui";

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
    <li
      className={`flex flex-col gap-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between ${ROW_PADDING}`}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold text-gray-900">
            {booking.travel_details.city}
          </p>
          <Badge variant={STATUS_VARIANT[booking.status] ?? "outline"}>
            {STATUS_LABEL[booking.status] ?? booking.status}
          </Badge>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {formatDate(booking.travel_details.date)}
          </span>
          <span className="font-mono text-xs">{booking.bookingCode ?? "—"}</span>
        </p>
      </div>

      <Button
        asChild
        variant="outline"
        className="h-9 shrink-0 self-start rounded-lg border-gray-200 text-gray-700 hover:bg-teal-500/10 hover:text-teal-700 sm:self-auto"
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
      viewAll={{
        label: "View All Bookings",
        href: "/dashboard/user/my-bookings",
      }}
    >
      {bookings.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No bookings yet"
          description="When you book a guided tour it will show up here."
          action={{ label: "Explore Tours", href: "/services" }}
        />
      ) : (
        <ul className="divide-y divide-gray-200">
          {bookings.map((booking) => (
            <BookingRow key={booking._id} booking={booking} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
