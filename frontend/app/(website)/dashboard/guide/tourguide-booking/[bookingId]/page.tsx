"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import { AppDispatch, RootState } from '@/lib/store';
import { format } from 'date-fns';
import { AlertCircle, ChevronLeft, User, Calendar, MapPin, IndianRupee, Languages } from 'lucide-react';

// Import thunks and actions from their consolidated location
import { fetchMyGuideBookingByIdThunk } from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';
import { clearCurrentBooking } from '@/lib/redux/userTourGuideBookingSlice';

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GuideEmptyState,
  GuideField,
  GuidePageHeader,
  GuidePanel,
  GuideSection,
  GuideStat,
  GuideStatStrip,
  GuideStatusBadge,
} from "@/components/guide";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const longDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : format(date, "PPP");
};

export default function GuideBookingDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { bookingId } = useParams();

  // Select the specific 'currentBooking' state for this page
  const { currentBooking: booking, loading, error } = useSelector((state: RootState) => state.userTourGuideBookings);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchMyGuideBookingByIdThunk(bookingId as string));
    }
    // IMPORTANT: Cleanup function to clear the booking from state when the component unmounts
    return () => {
      dispatch(clearCurrentBooking());
    };
  }, [dispatch, bookingId]);

  const backButton = (
    <Button variant="outline" onClick={() => router.back()}>
      <ChevronLeft className="mr-2 h-4 w-4" /> Back to All Bookings
    </Button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {backButton}
        <GuidePanel>
          <GuideEmptyState
            icon={AlertCircle}
            title="Could not load this booking"
            description={error}
          />
        </GuidePanel>
      </div>
    );
  }

  if (!booking) {
    // This state occurs briefly before loading or if the booking is not found
    return null;
  }

  // `user` may be populated (object) or a raw id (string) depending on the
  // endpoint — guard before reading fields.
  const touristUser =
    typeof booking.user === "object" && booking.user !== null ? booking.user : null;

  return (
    <div className="space-y-6">
      {backButton}

      <GuidePageHeader
        title="Booking Details"
        description={`Review the information for the tour in ${booking.location}.`}
        action={<GuideStatusBadge status={booking.status} />}
      />

      <GuidePanel>
        <div className="border-b border-slate-200 px-5 py-4">
          <GuideStatStrip>
            <GuideStat
              icon={Calendar}
              label="Start Date"
              value={longDate(booking.startDate)}
            />
            <GuideStat
              icon={Calendar}
              label="End Date"
              value={longDate(booking.endDate)}
            />
            <GuideStat
              icon={IndianRupee}
              label="Total Price"
              value={currency.format(booking.totalPrice)}
              accent
            />
          </GuideStatStrip>
        </div>
      </GuidePanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GuidePanel>
          <GuideSection title="Tourist Information" icon={User}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GuideField label="Name">{touristUser?.name || "N/A"}</GuideField>
              <GuideField label="Email">
                {touristUser?.email || "No email"}
              </GuideField>
              <div className="sm:col-span-2">
                <GuideField label="Contact Name (on form)">
                  {booking.contactInfo.fullName}
                </GuideField>
              </div>
            </div>
          </GuideSection>

          <GuideSection title="Tour Dates" icon={Calendar}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GuideField label="Start Date">{longDate(booking.startDate)}</GuideField>
              <GuideField label="End Date">{longDate(booking.endDate)}</GuideField>
            </div>
          </GuideSection>
        </GuidePanel>

        <GuidePanel>
          <GuideSection title="Location & Language" icon={MapPin}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GuideField label="Location">{booking.location}</GuideField>
              <GuideField label="Language Requested">
                <span className="inline-flex items-center gap-2">
                  <Languages className="h-4 w-4 text-slate-400" />
                  {booking.language}
                </span>
              </GuideField>
            </div>
          </GuideSection>

          <GuideSection title="Payment Details" icon={IndianRupee}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GuideField label="Total Price">
                <span className="text-2xl font-bold text-green-600">
                  {currency.format(booking.totalPrice)}
                </span>
              </GuideField>
              <GuideField label="Payment Status">
                <GuideStatusBadge status={booking.paymentStatus} />
              </GuideField>
            </div>
          </GuideSection>
        </GuidePanel>
      </div>
    </div>
  );
}
