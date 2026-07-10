// app/dashboard/guide/all-bookings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchGuideBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Ticket, Wallet, CalendarClock } from "lucide-react";
import {
  GuideCellStack,
  GuideEmptyState,
  GuidePageHeader,
  GuidePagination,
  GuidePanel,
  GuideSearchInput,
  GuideStat,
  GuideStatusBadge,
  GuideTable,
  GuideTableCell,
  GuideTableHead,
  GuideTableRow,
  GuideToolbar,
} from "@/components/guide";

const PAGE_SIZE = 10;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const EARNED_STATUSES = new Set(["completed", "successful"]);
const CLOSED_STATUSES = new Set(["completed", "cancelled"]);

export default function AllGuideBookingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { bookings, loading, error } = useAppSelector(
    (state) => state.bookings,
  );

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchGuideBookings());
  }, [dispatch]);

  const stats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const earnings = bookings
      .filter((b) => EARNED_STATUSES.has(b.status?.toLowerCase()))
      .reduce((sum, b) => sum + (b.booking_configuration?.price ?? 0), 0);

    const upcoming = bookings.filter((b) => {
      if (CLOSED_STATUSES.has(b.status?.toLowerCase())) return false;
      const date = new Date(b.travel_details?.date);
      return !Number.isNaN(date.valueOf()) && date >= startOfToday;
    }).length;

    return { total: bookings.length, upcoming, earnings };
  }, [bookings]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bookings;

    return bookings.filter((booking) =>
      [
        booking.tourist_info?.name,
        booking.travel_details?.city,
        booking.transaction_id,
        booking.status,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle)),
    );
  }, [bookings, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A shrinking result set can strand the viewer on a page that no longer
  // exists; clamp rather than render an empty table body.
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="All Service Bookings"
        description="Every tour you have been assigned to."
      />

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat
                icon={Ticket}
                label="Total Bookings"
                value={stats.total}
              />
              <GuideStat
                icon={CalendarClock}
                label="Upcoming Tours"
                value={stats.upcoming}
              />
              <GuideStat
                icon={Wallet}
                label="Earnings to Date"
                value={currency.format(stats.earnings)}
                accent
              />
            </>
          }
        >
          <GuideSearchInput
            value={query}
            onChange={handleSearch}
            placeholder="Search bookings"
          />
        </GuideToolbar>

        {loading && bookings.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <GuideEmptyState
            icon={AlertCircle}
            title="Could not load your bookings"
            description={error}
          />
        ) : visible.length === 0 ? (
          <GuideEmptyState
            icon={Ticket}
            title={query ? "No matching bookings" : "No bookings found"}
            description={
              query
                ? "Try a different name, city, or transaction ID."
                : "You have not been assigned to any tours yet."
            }
          />
        ) : (
          <>
            <GuideTable>
              <GuideTableHead
                columns={[
                  "Transaction ID",
                  "Customer",
                  "Destination",
                  "Travellers",
                  "Date",
                  "Amount",
                  "Status",
                ]}
              />
              <tbody>
                {visible.map((booking) => (
                  <GuideTableRow
                    key={booking._id}
                    onClick={() =>
                      router.push(`/dashboard/guide/all-bookings/${booking._id}`)
                    }
                  >
                    <GuideTableCell className="font-mono text-xs text-slate-500">
                      {booking.transaction_id || "—"}
                    </GuideTableCell>
                    <GuideTableCell>
                      <GuideCellStack
                        primary={booking.tourist_info.name}
                        secondary={booking.tourist_info.country}
                      />
                    </GuideTableCell>
                    <GuideTableCell>
                      <GuideCellStack
                        primary={booking.travel_details.city}
                        secondary={
                          booking.travel_details.places?.join(", ") || undefined
                        }
                      />
                    </GuideTableCell>
                    <GuideTableCell>
                      {booking.travel_details.no_of_person}
                    </GuideTableCell>
                    <GuideTableCell className="whitespace-nowrap">
                      {shortDate(booking.travel_details.date)}
                    </GuideTableCell>
                    <GuideTableCell className="font-semibold whitespace-nowrap text-slate-900">
                      {currency.format(booking.booking_configuration?.price ?? 0)}
                    </GuideTableCell>
                    <GuideTableCell last>
                      <GuideStatusBadge status={booking.status} />
                    </GuideTableCell>
                  </GuideTableRow>
                ))}
              </tbody>
            </GuideTable>

            <GuidePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </GuidePanel>
    </div>
  );
}
