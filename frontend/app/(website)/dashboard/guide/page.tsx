"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { getMyGuideProfile } from "@/lib/redux/thunks/guide/guideThunk";
import { fetchGuideBookings } from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BadgeInfo,
  ShieldCheck,
  AlertTriangle,
  Star,
  MapPin,
  Ticket,
  CalendarClock,
  CalendarRange,
  Route,
  MessageSquareQuote,
  UserRoundCog,
  Wallet,
  Inbox,
} from "lucide-react";
import {
  GuideCellStack,
  GuideEmptyState,
  GuidePanel,
  GuideStatCard,
  GuideStatusBadge,
  GuideTable,
  GuideTableCell,
  GuideTableHead,
  GuideTableRow,
} from "@/components/guide";

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

const MS_PER_DAY = 86_400_000;

/** Statuses that mean the booking is done and the fee is realised. */
const EARNED_STATUSES = new Set(["completed", "successful"]);
/** Statuses that take a booking out of the guide's forward schedule. */
const CLOSED_STATUSES = new Set(["completed", "cancelled"]);
/** Below this many days left, an active membership still warrants a warning. */
const EXPIRY_WARNING_DAYS = 7;

const QUICK_ACTIONS = [
  {
    href: "/dashboard/guide/availability",
    icon: CalendarRange,
    title: "Availability",
    description: "Block dates and leave",
  },
  {
    href: "/dashboard/guide/all-bookings",
    icon: Ticket,
    title: "Bookings",
    description: "Every reservation",
  },
  {
    href: "/dashboard/guide/trips",
    icon: Route,
    title: "Trips",
    description: "Start and complete tours",
  },
  {
    href: "/dashboard/guide/reviews",
    icon: MessageSquareQuote,
    title: "Reviews",
    description: "What travellers said",
  },
];

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-40 rounded-2xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-80 rounded-xl" />
  </div>
);

/** Translucent chip for the facts sitting under the guide's name in the hero. */
const HeroPill = ({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur">
    <Icon className="h-3.5 w-3.5" />
    {children}
  </span>
);

export default function GuideDashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    myProfile: profile,
    loading,
    error,
  } = useSelector((state: RootState) => state.guide);
  const { bookings } = useSelector((state: RootState) => state.bookings);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(getMyGuideProfile());
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

  // Newest first — `createdAt` is an ISO string, so lexical order is chronological.
  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [bookings],
  );

  if (loading && !profile) return <DashboardSkeleton />;

  if (error && !profile) {
    return (
      <GuidePanel className="p-6">
        <div className="flex items-center gap-3 text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load your guide profile</p>
            <p className="text-sm text-red-600/80">
              Please refresh the page and try again.
            </p>
          </div>
        </div>
      </GuidePanel>
    );
  }

  const registered = !!profile?.registrationCompleted;
  const isMembershipActive =
    profile?.isVisible &&
    !profile?.membershipExpired &&
    !!profile?.membershipExpiryDate;
  const expiryDate = profile?.membershipExpiryDate
    ? shortDate(profile.membershipExpiryDate)
    : null;
  const daysLeft = profile?.membershipExpiryDate
    ? Math.ceil(
        (new Date(profile.membershipExpiryDate).getTime() - Date.now()) /
          MS_PER_DAY,
      )
    : null;
  const expiringSoon =
    isMembershipActive && daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS;
  const expiryCountdown =
    daysLeft === null || daysLeft <= 0
      ? "today"
      : daysLeft === 1
        ? "tomorrow"
        : `in ${daysLeft} days`;

  const name = user?.name || "Guide";
  const initial = name.trim().charAt(0).toUpperCase() || "G";
  const reviewCount = profile?.numReviews ?? 0;
  const averageRating = profile?.averageRating ?? 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-green-600 via-green-600 to-emerald-500 px-6 py-7 text-white shadow-sm sm:px-8">
        {/* Soft light sources; purely decorative, so hidden from assistive tech. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold ring-1 ring-inset ring-white/25 backdrop-blur">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white/70">Welcome back</p>
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <HeroPill icon={BadgeInfo}>
                  <span className="font-mono">Guide ID: {profile?.guideCode ?? "—"}</span>
                </HeroPill>
                <HeroPill icon={isMembershipActive ? ShieldCheck : AlertTriangle}>
                  {isMembershipActive ? "Membership active" : "Not listed"}
                </HeroPill>
                {profile?.city && (
                  <HeroPill icon={MapPin}>{profile.city}</HeroPill>
                )}
                {reviewCount > 0 && (
                  <HeroPill icon={Star}>
                    {averageRating.toFixed(1)} · {reviewCount} reviews
                  </HeroPill>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {registered ? (
              <Button
                asChild
                size="lg"
                className="bg-white text-green-700 shadow-sm hover:bg-white/90"
              >
                <Link href="/dashboard/guide/buy-subscription">
                  <Wallet className="mr-2 h-4 w-4" />
                  {isMembershipActive ? "Renew Early" : "Renew Membership"}
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="bg-white text-green-700 shadow-sm hover:bg-white/90"
              >
                <Link href="/register-guide">
                  <BadgeInfo className="mr-2 h-4 w-4" />
                  Complete Profile
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Only states that need the guide to act get a banner; a healthy
          membership is already reported by the pill in the hero. */}
      {!registered ? (
        <GuidePanel className="border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <BadgeInfo className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Action required: complete your profile
              </p>
              <p className="mt-1 text-sm text-amber-800/80">
                Add your languages, experience, location, pricing, and identity
                documents to start accepting bookings.
              </p>
            </div>
          </div>
        </GuidePanel>
      ) : !isMembershipActive ? (
        <GuidePanel className="border-red-200 bg-red-50/60 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Membership expired</p>
              <p className="mt-1 text-sm text-red-800/80">
                Your profile is currently hidden from public search.
                {expiryDate && ` Expired on ${expiryDate}.`}
              </p>
            </div>
          </div>
        </GuidePanel>
      ) : expiringSoon ? (
        <GuidePanel className="border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Membership expires {expiryCountdown}
              </p>
              <p className="mt-1 text-sm text-amber-800/80">
                Renew before {expiryDate} to stay listed and keep taking
                bookings.
              </p>
            </div>
          </div>
        </GuidePanel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GuideStatCard
          icon={Ticket}
          label="Total Bookings"
          value={stats.total}
          hint="All time"
          tone="slate"
        />
        <GuideStatCard
          icon={CalendarClock}
          label="Upcoming Tours"
          value={stats.upcoming}
          hint="Today onwards"
          tone="blue"
        />
        <GuideStatCard
          icon={Wallet}
          label="Earnings to Date"
          value={currency.format(stats.earnings)}
          hint="From completed tours"
          tone="green"
        />
        <GuideStatCard
          icon={Star}
          label="Average Rating"
          value={reviewCount > 0 ? averageRating.toFixed(1) : "—"}
          hint={
            reviewCount > 0
              ? `Across ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
              : "No reviews yet"
          }
          tone="amber"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200 transition group-hover:bg-green-50 group-hover:text-green-600 group-hover:ring-green-200">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {title}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {description}
              </span>
            </span>
            <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-green-600" />
          </Link>
        ))}
      </div>

      <GuidePanel>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recent bookings
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Your six latest reservations
            </p>
          </div>
          <Link
            href="/dashboard/guide/all-bookings"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-green-600 transition-colors hover:text-green-700"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <GuideEmptyState
            icon={Inbox}
            title="No bookings yet"
            description="Once travellers book you, their reservations will appear here."
            action={
              !registered ? (
                <Button asChild variant="outline">
                  <Link href="/register-guide">
                    <UserRoundCog className="mr-2 h-4 w-4" />
                    Complete your profile
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <GuideTable>
            <GuideTableHead
              columns={[
                "Customer",
                "Destination",
                "Travellers",
                "Date",
                "Amount",
                "Status",
              ]}
            />
            <tbody>
              {recentBookings.map((booking) => (
                <GuideTableRow key={booking._id}>
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
                  <GuideTableCell>
                    {shortDate(booking.travel_details.date)}
                  </GuideTableCell>
                  <GuideTableCell className="font-semibold text-slate-900">
                    {currency.format(booking.booking_configuration?.price ?? 0)}
                  </GuideTableCell>
                  <GuideTableCell last>
                    <GuideStatusBadge status={booking.status} />
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
