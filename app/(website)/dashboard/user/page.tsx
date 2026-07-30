"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchTouristDashboard } from "@/lib/redux/thunks/tourist/touristDashboardThunk";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/dashboard/tourist/ActivityTimeline";
import { DashboardHeader } from "@/components/dashboard/tourist/DashboardHeader";
import { DashboardSkeleton } from "@/components/dashboard/tourist/DashboardSkeleton";
import { NotificationsPreview } from "@/components/dashboard/tourist/NotificationsPreview";
import { PaymentSummary } from "@/components/dashboard/tourist/PaymentSummary";
import { ProfileSummary } from "@/components/dashboard/tourist/ProfileSummary";
import { QuickActions } from "@/components/dashboard/tourist/QuickActions";
import { RecentBookingsPreview } from "@/components/dashboard/tourist/RecentBookingsPreview";
import { RecentTripsPreview } from "@/components/dashboard/tourist/RecentTripsPreview";
import { ReviewReminder } from "@/components/dashboard/tourist/ReviewReminder";
import { StatsGrid } from "@/components/dashboard/tourist/StatsGrid";
import { UpcomingTripHero } from "@/components/dashboard/tourist/UpcomingTripHero";
import { PAGE } from "@/components/dashboard/tourist/ui";

/**
 * Tourist Dashboard Home — a summary, not a replacement for the detail pages.
 *
 * The whole page is backed by a single request (GET /tourist/dashboard); the
 * detail pages (My Bookings, My Trips, Reviews, Notifications) keep their own
 * endpoints and remain the place to see the full lists.
 */
export default function UserDashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { overview, loading, error } = useAppSelector(
    (state) => state.touristDashboard,
  );

  useEffect(() => {
    dispatch(fetchTouristDashboard());
  }, [dispatch]);

  // A tourist who never finished onboarding has no profile to summarise — send
  // them to complete it rather than rendering a dashboard full of dashes.
  useEffect(() => {
    if (overview && !overview.profile.registrationCompleted) {
      router.push("/tourist/onboarding");
    }
  }, [overview, router]);

  if (loading && !overview) {
    return <DashboardSkeleton />;
  }

  if (error && !overview) {
    return (
      <div className={PAGE}>
        <Alert variant="destructive" className="rounded-xl p-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">
            Could not load your dashboard
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-4">
            <span className="text-sm leading-relaxed">{error}</span>
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => dispatch(fetchTouristDashboard())}
            >
              <RefreshCw aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // The redirect effect above will fire for an incomplete profile.
  if (!overview || !overview.profile.registrationCompleted) {
    return null;
  }

  const {
    profile,
    stats,
    upcomingTrip,
    recentBookings,
    recentTrips,
    notifications,
    payments,
    pendingReviews,
    activity,
  } = overview;

  return (
    <div className={PAGE}>
      <DashboardHeader profile={profile} />

      <StatsGrid stats={stats} />

      <ReviewReminder pendingReviews={pendingReviews} />

      <section aria-labelledby="next-trip-heading">
        <h2 id="next-trip-heading" className="sr-only">
          Your next trip
        </h2>
        <UpcomingTripHero trip={upcomingTrip} />
      </section>

      {/* Previews of the detail pages on the left; the at-a-glance widgets that
          have no page of their own on the right. One column until xl, where
          there's finally room for a 2:1 split without either side going narrow.
          The gap and the in-column rhythm are both 24px, so a card's neighbour
          sits the same distance away whichever direction it's in. */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RecentBookingsPreview bookings={recentBookings} />
          <RecentTripsPreview trips={recentTrips} />
          <QuickActions />
        </div>

        <div className="space-y-6">
          <NotificationsPreview
            notifications={notifications}
            unreadCount={stats.unreadNotifications}
          />
          <PaymentSummary payments={payments} />
          <ActivityTimeline activity={activity} />
          <ProfileSummary profile={profile} />
        </div>
      </div>
    </div>
  );
}
