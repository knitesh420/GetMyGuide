"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import { format } from "date-fns";
import { AlertCircle, CalendarClock, CheckCircle2, Inbox, Ticket } from "lucide-react";

// Import the thunk from its consolidated location
import { fetchMyGuideBookingsThunk } from "@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks";

import { Skeleton } from "@/components/ui/skeleton";
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

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : format(date, "dd MMM yyyy");
};

/** `user` arrives either populated or as a bare ObjectId string. */
const touristOf = (user: unknown) =>
  typeof user === "object" && user !== null
    ? (user as { name?: string; email?: string })
    : {};

export default function GuideBookingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  // Select state from the centralized userTourGuideBookings slice
  const { bookings, loading, error } = useSelector(
    (state: RootState) => state.userTourGuideBookings,
  );

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    // Dispatch the correct thunk to get the guide's own bookings
    dispatch(fetchMyGuideBookingsThunk());
  }, [dispatch]);

  const stats = useMemo(() => {
    const list = bookings ?? [];
    const byStatus = (name: string) =>
      list.filter((b) => b.status?.toLowerCase() === name).length;

    return {
      total: list.length,
      upcoming: byStatus("upcoming"),
      completed: byStatus("completed"),
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    const list = bookings ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;

    return list.filter((booking) => {
      const tourist = touristOf(booking.user);
      return [tourist.name, tourist.email, booking.location, booking.status]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    });
  }, [bookings, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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
        title="My Tour Bookings"
        description="A list of all tours that have been assigned to you."
      />

      <GuidePanel>
        <GuideToolbar
          stats={
            <>
              <GuideStat icon={Ticket} label="Total Bookings" value={stats.total} />
              <GuideStat
                icon={CalendarClock}
                label="Upcoming"
                value={stats.upcoming}
              />
              <GuideStat
                icon={CheckCircle2}
                label="Completed"
                value={stats.completed}
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

        {loading && (bookings?.length ?? 0) === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <GuideEmptyState
            icon={AlertCircle}
            title="Error fetching bookings"
            description={error}
          />
        ) : visible.length === 0 ? (
          <GuideEmptyState
            icon={Inbox}
            title={query ? "No matching bookings" : "No bookings found"}
            description={
              query
                ? "Try a different tourist name, email, or location."
                : "You have no tours assigned to you at the moment."
            }
          />
        ) : (
          <>
            <GuideTable>
              <GuideTableHead
                columns={["Tourist", "Tour Dates", "Location", "Status"]}
              />
              <tbody>
                {visible.map((booking) => {
                  const tourist = touristOf(booking.user);
                  return (
                    <GuideTableRow
                      key={booking._id}
                      onClick={() =>
                        router.push(
                          `/dashboard/guide/tourguide-booking/${booking._id}`,
                        )
                      }
                    >
                      <GuideTableCell>
                        <GuideCellStack
                          primary={tourist.name || "N/A"}
                          secondary={tourist.email || "No email"}
                        />
                      </GuideTableCell>
                      <GuideTableCell className="whitespace-nowrap">
                        {formatDate(booking.startDate)} —{" "}
                        {formatDate(booking.endDate)}
                      </GuideTableCell>
                      <GuideTableCell>{booking.location}</GuideTableCell>
                      <GuideTableCell last>
                        <GuideStatusBadge status={booking.status} />
                      </GuideTableCell>
                    </GuideTableRow>
                  );
                })}
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
