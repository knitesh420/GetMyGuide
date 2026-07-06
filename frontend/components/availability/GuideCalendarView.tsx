"use client";

import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { GuideCalendar } from "@/lib/data";

interface GuideCalendarViewProps {
  calendar: GuideCalendar | null;
  loading?: boolean;
  numberOfMonths?: number;
}

const modifierStyles = {
  unavailable: {
    backgroundColor: "hsl(var(--destructive) / 0.15)",
    color: "hsl(var(--destructive))",
    textDecoration: "line-through",
  },
  leave: {
    backgroundColor: "rgb(245 158 11 / 0.18)",
    color: "rgb(180 83 9)",
  },
  booked: {
    backgroundColor: "hsl(var(--primary) / 0.15)",
    color: "hsl(var(--primary))",
    fontWeight: 600,
  },
};

/**
 * Read-only merged calendar: unavailable dates + active leave periods +
 * booked (assigned/accepted) ranges. Shared by the guide's own availability
 * page and the admin Guide Calendar page — both consume the same
 * GuideCalendar shape from GET /guide-availability/calendar/*.
 */
export function GuideCalendarView({ calendar, loading, numberOfMonths = 2 }: GuideCalendarViewProps) {
  if (loading && !calendar) {
    return <Skeleton className="h-[380px] w-full" />;
  }

  const unavailable = (calendar?.unavailableDates ?? []).map((d) => new Date(d));
  const leave = (calendar?.leaves ?? [])
    .filter((l) => l.status === "active")
    .map((l) => ({ from: new Date(l.startDate), to: new Date(l.endDate) }));
  const booked = (calendar?.bookedRanges ?? []).map((r) => ({ from: new Date(r.start), to: new Date(r.end) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Calendar
          mode="multiple"
          selected={[]}
          onSelect={() => {}}
          modifiers={{ unavailable, leave, booked }}
          modifiersStyles={modifierStyles}
          numberOfMonths={numberOfMonths}
          className="p-3"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.4)" }} />
          Booked (assigned trip)
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgb(245 158 11 / 0.4)" }} />
          Vacation / Emergency leave
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--destructive) / 0.3)" }} />
          Marked unavailable
        </div>
      </div>
    </div>
  );
}
