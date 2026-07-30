// app/dashboard/guide/upcoming-tours/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Search, Users } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchGuideBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import {
  GuideCellStack,
  GuideEmptyState,
  GuidePageHeader,
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminBookingSummary } from "@/lib/data";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const longDate = (value?: string | Date) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/** A booking is still ahead of the guide while it is live and hasn't finished. */
const LIVE_STATUSES = new Set(["successful", "confirmed", "allocated"]);

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * The guide's forward schedule: reservations allocated to them that have not yet
 * happened, soonest first. A narrowed view of the same data as All Service
 * Bookings — it exists so a guide can see "what am I doing next" at a glance.
 */
export default function GuideUpcomingToursPage() {
  const dispatch = useAppDispatch();
  const { bookings, loading, error } = useAppSelector((state) => state.bookings);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchGuideBookings());
  }, [dispatch]);

  const upcoming = useMemo(() => {
    const today = startOfToday();

    return (bookings ?? [])
      .filter((booking: AdminBookingSummary) => {
        if (!LIVE_STATUSES.has(booking.status)) return false;

        const date = booking.travel_details?.date;
        if (!date) return false;

        // An outstation or multi-day booking runs past its start date, so
        // end_date is the honest finish line wherever it is set.
        const finish = new Date((booking as any).end_date ?? date);
        return finish >= today;
      })
      .sort(
        (a, b) =>
          new Date(a.travel_details.date).getTime() - new Date(b.travel_details.date).getTime(),
      );
  }, [bookings]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return upcoming;

    return upcoming.filter((booking) => {
      const city = booking.travel_details?.city ?? "";
      const name = booking.tourist_info?.name ?? "";
      const code = (booking as any).bookingCode ?? "";
      return (
        city.toLowerCase().includes(term) ||
        name.toLowerCase().includes(term) ||
        code.toLowerCase().includes(term)
      );
    });
  }, [upcoming, search]);

  const nextUp = upcoming[0];

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="My Upcoming Tours"
        description="Bookings allocated to you that haven't happened yet, soonest first."
      />

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat icon={CalendarClock} label="Upcoming" value={upcoming.length} />
              <GuideStat
                icon={MapPin}
                label="Next trip"
                value={nextUp ? longDate(nextUp.travel_details?.date) : "—"}
                accent
              />
            </>
          }
        >
          <GuideSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search city, traveller, or ref"
          />
        </GuideToolbar>

        {loading && upcoming.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <GuideEmptyState
            icon={Search}
            title={upcoming.length === 0 ? "Nothing coming up" : "No matches"}
            description={
              upcoming.length === 0
                ? "Accept an assignment and it will show up here."
                : "Try a different search term."
            }
            action={
              upcoming.length === 0 ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard/guide/assignments">View assignment requests</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <GuideTable>
            <GuideTableHead
              columns={["Ref", "Destination", "Traveller", "Date", "Value", "Status", ""]}
            />
            <tbody>
              {filtered.map((booking) => (
                <GuideTableRow key={booking._id}>
                  <GuideTableCell className="font-semibold text-slate-900">
                    {(booking as any).bookingCode ?? "—"}
                  </GuideTableCell>

                  <GuideTableCell>
                    <GuideCellStack
                      primary={booking.travel_details?.city ?? "—"}
                      secondary={(booking.travel_details?.places ?? []).join(", ")}
                    />
                  </GuideTableCell>

                  <GuideTableCell>
                    <GuideCellStack
                      primary={booking.tourist_info?.name ?? "—"}
                      secondary={
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {booking.travel_details?.no_of_person ?? 1}
                        </span>
                      }
                    />
                  </GuideTableCell>

                  <GuideTableCell>{longDate(booking.travel_details?.date)}</GuideTableCell>

                  <GuideTableCell>
                    {currency.format(booking.booking_configuration?.price ?? 0)}
                  </GuideTableCell>

                  <GuideTableCell>
                    <GuideStatusBadge status={booking.status} />
                  </GuideTableCell>

                  <GuideTableCell last>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/guide/all-bookings/${booking._id}`}>Details</Link>
                    </Button>
                  </GuideTableCell>
                </GuideTableRow>
              ))}
            </tbody>
          </GuideTable>
        )}
      </GuidePanel>
    </div>
  );
}
