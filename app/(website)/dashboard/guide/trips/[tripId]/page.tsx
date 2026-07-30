"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchTripById } from "@/lib/redux/thunks/trip/tripThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PopulatedAccountSummary, PopulatedBookingSummary } from "@/lib/data";
import { ArrowLeft, Calendar, MapPin, Route, User, Users } from "lucide-react";
import {
  GuideField,
  GuidePageHeader,
  GuidePanel,
  GuideSection,
  GuideStat,
  GuideStatStrip,
  GuideStatusBadge,
} from "@/components/guide";

function asBooking(value: unknown): PopulatedBookingSummary | null {
  return value && typeof value === "object" ? (value as PopulatedBookingSummary) : null;
}

function asAccount(value: unknown): PopulatedAccountSummary | null {
  return value && typeof value === "object" ? (value as PopulatedAccountSummary) : null;
}

const shortDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const dateTime = (value: string) => new Date(value).toLocaleString("en-IN");

export default function GuideTripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { currentTrip, loading } = useSelector((state: RootState) => state.trips);

  useEffect(() => {
    if (params.tripId) dispatch(fetchTripById(params.tripId));
  }, [dispatch, params.tripId]);

  if (loading && !currentTrip) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!currentTrip) return null;

  const booking = asBooking(currentTrip.booking);
  const guide = asAccount(currentTrip.guide);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push("/dashboard/guide/trips")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Trips
      </Button>

      <GuidePageHeader
        title={`${booking?.travel_details.city ?? "Trip"} Details`}
        description={booking?.travel_details.places?.join(", ") || undefined}
        action={<GuideStatusBadge status={currentTrip.status} />}
      />

      <GuidePanel>
        <div className="border-b border-slate-200 px-5 py-4">
          <GuideStatStrip>
            <GuideStat
              icon={Calendar}
              label="Travel Date"
              value={shortDate(booking?.travel_details.date)}
            />
            <GuideStat
              icon={Users}
              label="Travellers"
              value={booking?.travel_details.no_of_person ?? "—"}
            />
            <GuideStat
              icon={Route}
              label="Trip Status"
              value={currentTrip.status.replace(/-/g, " ")}
              accent={currentTrip.status === "completed"}
            />
          </GuideStatStrip>
        </div>
      </GuidePanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GuidePanel>
          <GuideSection title="Booking Info" icon={User}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GuideField label="Tourist">
                {booking?.tourist_info.name ?? "—"}
              </GuideField>
              <GuideField label="Phone">
                {booking?.tourist_info.phone ?? "—"}
              </GuideField>
              <GuideField label="Date">
                {shortDate(booking?.travel_details.date)}
              </GuideField>
              <GuideField label="Travellers">
                {booking?.travel_details.no_of_person ?? "—"}
              </GuideField>
              <div className="sm:col-span-2">
                <GuideField label="Places">
                  {booking?.travel_details.places?.join(", ") || "—"}
                </GuideField>
              </div>
              {guide?.name && (
                <div className="sm:col-span-2">
                  <GuideField label="Guide">{guide.name}</GuideField>
                </div>
              )}
            </div>
          </GuideSection>
        </GuidePanel>

        <GuidePanel>
          <GuideSection title="Trip Timeline" icon={MapPin}>
            {currentTrip.startedAt ? (
              <div className="space-y-5">
                <GuideField label="Started">
                  {dateTime(currentTrip.startedAt)}
                </GuideField>
                {currentTrip.startNotes && (
                  <GuideField label="Start Notes">
                    <span className="font-normal text-slate-600">
                      {currentTrip.startNotes}
                    </span>
                  </GuideField>
                )}
                {currentTrip.completedAt && (
                  <GuideField label="Completed">
                    {dateTime(currentTrip.completedAt)}
                  </GuideField>
                )}
                {currentTrip.completionNotes && (
                  <GuideField label="Completion Notes">
                    <span className="font-normal text-slate-600">
                      {currentTrip.completionNotes}
                    </span>
                  </GuideField>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Trip has not started yet.</p>
            )}
          </GuideSection>
        </GuidePanel>
      </div>
    </div>
  );
}
