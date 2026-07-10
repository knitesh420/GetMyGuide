// app/dashboard/guide/all-bookings/[bookingId]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchBookingById } from "@/lib/redux/thunks/booking/bookingThunks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Settings2,
  User,
  Users,
} from "lucide-react";
import {
  GuideEmptyState,
  GuideField as Field,
  GuidePageHeader,
  GuidePanel,
  GuideSection as Section,
  GuideStat,
  GuideStatStrip,
  GuideStatusBadge,
  GuideYesNo as YesNo,
} from "@/components/guide";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const longDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

export default function GuideBookingDetailsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { bookingId } = params;

  const {
    currentBooking: booking,
    loading,
    error,
  } = useAppSelector((state) => state.bookings);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId as string));
    }
  }, [dispatch, bookingId]);

  const backButton = (
    <Button
      variant="outline"
      onClick={() => router.push("/dashboard/guide/all-bookings")}
    >
      <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Bookings
    </Button>
  );

  if (loading && !booking) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-6">
        {backButton}
        <GuidePanel>
          <GuideEmptyState
            icon={AlertCircle}
            title={error ? "Could not load this booking" : "Booking not found"}
            description={
              error || "The booking you're looking for doesn't exist."
            }
          />
        </GuidePanel>
      </div>
    );
  }

  const { tourist_info, travel_details, guide_preferences, booking_configuration } =
    booking;
  const outstation = booking_configuration?.outstation;

  return (
    <div className="space-y-6">
      {backButton}

      <GuidePageHeader
        title={travel_details.city || "Booking"}
        description={`Booking ID: ${booking._id}`}
        action={<GuideStatusBadge status={booking.status} />}
      />

      <GuidePanel>
        <div className="border-b border-slate-200 px-5 py-4">
          <GuideStatStrip>
            <GuideStat
              icon={Calendar}
              label="Travel Date"
              value={longDate(travel_details.date)}
            />
            <GuideStat
              icon={Users}
              label="Travellers"
              value={travel_details.no_of_person}
            />
            <GuideStat
              icon={CreditCard}
              label="Total Amount"
              value={currency.format(booking_configuration?.price ?? 0)}
              accent
            />
          </GuideStatStrip>
        </div>
      </GuidePanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <GuidePanel>
            <Section title="Tour Details" icon={MapPin}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="City">{travel_details.city || "—"}</Field>
                <Field label="Duration">
                  {booking_configuration?.duration || "—"}
                </Field>
                <div className="md:col-span-2">
                  <Field label="Places">
                    {travel_details.places?.length
                      ? travel_details.places.join(", ")
                      : "—"}
                  </Field>
                </div>
                <Field label="Hotel Required">
                  <YesNo value={travel_details.preferences?.hotel} />
                </Field>
                <Field label="Taxi Required">
                  <YesNo value={travel_details.preferences?.taxi} />
                </Field>
              </div>
            </Section>

            <Section title="Booking Configuration" icon={Settings2}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Foreign Language Required">
                  <YesNo value={booking_configuration?.foreign_language_required} />
                </Field>
                <Field label="Early / Late Hours">
                  <YesNo value={booking_configuration?.early_late_hours} />
                </Field>
                <Field label="Extra City Allowances">
                  <YesNo value={booking_configuration?.extra_city_allowances} />
                </Field>
                <Field label="Preferred Guide Gender">
                  {guide_preferences?.gender || "Any"}
                </Field>
                <div className="md:col-span-2">
                  <Field label="Preferred Languages">
                    {guide_preferences?.guide_language?.length
                      ? guide_preferences.guide_language.join(", ")
                      : "Any"}
                  </Field>
                </div>
                {booking_configuration?.special_event_allowances?.length ? (
                  <div className="md:col-span-2">
                    <Field label="Special Event Allowances">
                      {booking_configuration.special_event_allowances.join(", ")}
                    </Field>
                  </div>
                ) : null}
              </div>
            </Section>

            {outstation && (
              <Section title="Outstation" icon={MapPin}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Distance">{outstation.distance} km</Field>
                  <Field label="Overnight Stays">
                    {outstation.over_night_stay}
                  </Field>
                  <Field label="Accommodation & Meals">
                    <YesNo value={outstation.accomodation_meals} />
                  </Field>
                  {outstation.special_excursion?.length ? (
                    <Field label="Special Excursions">
                      {outstation.special_excursion.join(", ")}
                    </Field>
                  ) : null}
                </div>
              </Section>
            )}

            <Section title="Payment" icon={CreditCard}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Total Amount">
                  <span className="text-2xl font-bold text-green-600">
                    {currency.format(booking_configuration?.price ?? 0)}
                  </span>
                </Field>
                <Field label="Transaction ID">
                  <span className="font-mono text-xs text-slate-500">
                    {booking.transaction_id || "—"}
                  </span>
                </Field>
              </div>
            </Section>
          </GuidePanel>
        </div>

        <div className="space-y-6">
          <GuidePanel>
            <Section title="Customer Information" icon={User}>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">
                    {tourist_info.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tourist_info.country || "Customer"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="truncate text-sm text-slate-700">
                      {tourist_info.email || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm text-slate-700">
                      {tourist_info.phone || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {tourist_info.phone ? (
                <Button className="mt-5 w-full" variant="outline" asChild>
                  <a href={`tel:${tourist_info.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Customer
                  </a>
                </Button>
              ) : (
                <Button className="mt-5 w-full" variant="outline" disabled>
                  <Phone className="mr-2 h-4 w-4" />
                  Phone Not Available
                </Button>
              )}
            </Section>
          </GuidePanel>

          <GuidePanel>
            <Section title="Booking Timeline" icon={Calendar}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-900">
                    {longDate(booking.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="font-medium text-slate-900">
                    {longDate(booking.updatedAt)}
                  </span>
                </div>
              </div>
            </Section>
          </GuidePanel>
        </div>
      </div>
    </div>
  );
}
