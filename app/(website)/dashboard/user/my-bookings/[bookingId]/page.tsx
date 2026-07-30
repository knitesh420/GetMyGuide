"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchBookingById } from "@/lib/redux/thunks/booking/bookingThunks";
import { apiService } from "@/lib/service/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingActions } from "@/components/booking/BookingActions";
import { BookingChat } from "@/components/chat/BookingChat";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  Languages,
  Loader2,
  MapPin,
  ReceiptText,
  Users,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/components/dashboard/tourist/format";
import {
  CARD,
  PAGE_NARROW,
  PAGE_TITLE,
} from "@/components/dashboard/tourist/ui";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const statusLabel: Record<string, string> = {
  "payment-pending": "Payment Pending",
  successful: "Booked",
  confirmed: "Confirmed",
  allocated: "Guide Allocated",
  completed: "Completed",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "successful":
    case "confirmed":
    case "allocated":
      return "default";
    case "completed":
      return "secondary";
    case "payment-pending":
      return "destructive";
    default:
      return "outline";
  }
}

// Payment details a tourist is allowed to see for their own booking. The
// invoice list endpoint (GET /invoice) is auto-scoped to the caller's account,
// so we just find the invoice whose `booking` matches this booking.
interface TouristInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  paymentDate: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  booking?: string;
  paymentInfo: {
    method?: string;
    amount: number;
    tax: number;
    discount: number;
    grandTotal: number;
    status: string;
    currency: string;
  };
  status: string;
  pdfUrl?: string;
}

/** A titled card. Every section of the page is one of these, so they all share
 *  the same padding, heading size and border. */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(CARD, "gap-0 p-5")}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {Icon && (
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-semibold break-words text-slate-900">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}

/**
 * Label/value pair inside a section. `mono` puts the value in Geist Mono — used
 * for the identifiers (booking, invoice, payment, order, transaction) so they
 * stay scannable and align digit-for-digit.
 */
function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium break-words text-slate-900",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** The one grid every section's fields sit on, so labels line up across cards. */
function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-6 sm:grid-cols-2">{children}</dl>;
}

const yesNo = (v: boolean | undefined) => (v ? "Yes" : "No");

export default function BookingDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const bookingId = params.bookingId as string | undefined;

  const { currentBooking, loading, error } = useAppSelector(
    (state) => state.bookings,
  );

  const booking = currentBooking as AdminBookingSummary | null;

  const [invoice, setInvoice] = useState<TouristInvoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

  // Load the tourist's invoices and pick the one for this booking. Kept
  // separate from the booking fetch so a missing invoice (e.g. payment still
  // settling) never blocks the rest of the page.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;

    const loadInvoice = async () => {
      setInvoiceLoading(true);
      try {
        const res = await apiService.get(`/invoice`, {
          params: { limit: 200 },
        });
        const payload = (res as any).data ?? res;
        const list: TouristInvoice[] = Array.isArray(payload)
          ? payload
          : payload.data || payload.invoices || [];
        const match =
          list.find(
            (inv) => (inv.booking?.toString?.() ?? inv.booking) === bookingId,
          ) ?? null;
        if (!cancelled) setInvoice(match);
      } catch {
        if (!cancelled) setInvoice(null);
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    };

    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading && !booking) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={PAGE_NARROW}
      >
        <span className="sr-only">Loading your booking…</span>
        <Skeleton className="h-9 w-40 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={PAGE_NARROW}>
        <Card className={cn(CARD, "p-5")}>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle aria-hidden="true" className="h-12 w-12 text-red-600" />
            <div className="space-y-1.5">
              <p className="text-lg font-semibold text-slate-900">
                Could not load this booking
              </p>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500">
                {error}
              </p>
            </div>
            <Button asChild className="mt-2 h-10 rounded-lg px-5">
              <Link href="/dashboard/user/my-bookings">Back to My Bookings</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={PAGE_NARROW}>
        <Card className={cn(CARD, "p-5")}>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-lg font-semibold text-slate-900">
              Booking not found
            </p>
            <Button asChild className="h-10 rounded-lg px-5">
              <Link href="/dashboard/user/my-bookings">Back to My Bookings</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const languages = booking.guide_preferences.guide_language;
  const config = booking.booking_configuration;
  const outstation = config.outstation;
  const isPackage = booking.booking_type === "package";
  const currency = invoice?.paymentInfo.currency || "INR";

  return (
    <div className={PAGE_NARROW}>
      {/* Page header — the <h1> lives here, above the cards, rather than inside
          the first card's title. */}
      <div className="space-y-6">
        <Button
          asChild
          variant="outline"
          className="h-9 rounded-lg border-slate-200 text-slate-700 hover:bg-teal-500/10 hover:text-teal-700"
        >
          <Link href="/dashboard/user/my-bookings">
            <ArrowLeft aria-hidden="true" className="mr-1.5 h-4 w-4" />
            Back to My Bookings
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className={PAGE_TITLE}>{booking.travel_details.city}</h1>
            <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-500 md:text-base">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{booking.travel_details.places.join(", ")}</span>
            </p>
            <p className="text-sm text-slate-500">
              Booking ID:{" "}
              <span className="font-mono font-medium text-slate-900">
                {booking.bookingCode ?? "—"}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              Booked on {formatDate(booking.createdAt)}
            </p>
          </div>

          <Badge
            variant={getStatusVariant(booking.status)}
            className="shrink-0 self-start whitespace-nowrap"
          >
            {statusLabel[booking.status] || booking.status}
          </Badge>
        </div>
      </div>

      <Alert className="rounded-xl border-teal-200 bg-teal-50 p-5">
        <CheckCircle className="h-4 w-4 text-teal-600" />
        <AlertTitle className="font-semibold text-slate-900">
          Booking Received
        </AlertTitle>
        <AlertDescription className="text-sm leading-relaxed text-slate-700">
          Your custom tour guide request has been recorded. Our team will use
          these details to coordinate the guide assignment.
        </AlertDescription>
      </Alert>

      <Section title="Overview">
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailItem
            icon={Calendar}
            label="Travel Date"
            value={formatDate(booking.travel_details.date)}
          />
          <DetailItem
            icon={Users}
            label="Travelers"
            value={booking.travel_details.no_of_person}
          />
          <DetailItem
            icon={Languages}
            label="Preferred Languages"
            value={languages.length ? languages.join(", ") : "No preference"}
          />
          <DetailItem
            icon={ReceiptText}
            label="Transaction ID"
            value={booking.transaction_id}
          />
        </div>
      </Section>

      <Section title="Traveler Information">
        <Fields>
          <Field label="Name" value={booking.tourist_info.name} />
          <Field label="Email" value={booking.tourist_info.email} />
          <Field label="Phone" value={booking.tourist_info.phone} />
          <Field label="Country" value={booking.tourist_info.country} />
          <Field label="Gender" value={booking.tourist_info.gender || "N/A"} />
        </Fields>
      </Section>

      <Section title="Travel Details">
        <Fields>
          <Field label="City" value={booking.travel_details.city} />
          <Field
            label="Places"
            value={booking.travel_details.places.join(", ")}
          />
          <Field
            label="Travel Date"
            value={formatDate(booking.travel_details.date)}
          />
          <Field
            label="No. of Persons"
            value={booking.travel_details.no_of_person}
          />
          <Field
            label="Hotel Assistance"
            value={yesNo(booking.travel_details.preferences.hotel)}
          />
          <Field
            label="Taxi Service"
            value={yesNo(booking.travel_details.preferences.taxi)}
          />
        </Fields>
      </Section>

      <Section title="Guide Preferences">
        <Fields>
          <Field
            label="Languages"
            value={languages.length ? languages.join(", ") : "No preference"}
          />
          <Field
            label="Preferred Gender"
            value={
              booking.guide_preferences.gender === "none"
                ? "No preference"
                : booking.guide_preferences.gender
            }
          />
        </Fields>
      </Section>

      <Section title="Booking Configuration">
        <Fields>
          <Field label="Duration" value={config.duration} />
          <Field
            label="Foreign Language Required"
            value={yesNo(config.foreign_language_required)}
          />
          <Field
            label="Early / Late Hours"
            value={yesNo(config.early_late_hours)}
          />
          <Field
            label="Extra City Allowances"
            value={yesNo(config.extra_city_allowances)}
          />
          <Field
            label="Special Event Allowances"
            value={
              config.special_event_allowances.length
                ? config.special_event_allowances.join(", ")
                : "None"
            }
          />
          <Field label="Total Fee" value={formatCurrency(config.price)} />
        </Fields>
      </Section>

      {outstation && (
        <Section title="Outstation Details">
          <Fields>
            <Field label="Distance" value={`${outstation.distance} km`} />
            <Field
              label="Overnight Stay"
              value={`${outstation.over_night_stay} night(s)`}
            />
            <Field
              label="Accommodation & Meals"
              value={yesNo(outstation.accomodation_meals)}
            />
            <Field
              label="Excursions"
              value={
                outstation.special_excursion.length
                  ? outstation.special_excursion.join(", ")
                  : "None"
              }
            />
          </Fields>
        </Section>
      )}

      {/* Package-specific figures (only present on package bookings) */}
      {isPackage && (
        <Section title="Package Details">
          <Fields>
            {booking.package_info?.title && (
              <Field label="Package" value={booking.package_info.title} />
            )}
            {booking.guide_info?.name && (
              <Field label="Assigned Guide" value={booking.guide_info.name} />
            )}
            {booking.end_date && (
              <Field label="End Date" value={formatDate(booking.end_date)} />
            )}
            {typeof booking.advance_paid === "number" && (
              <Field
                label="Advance Paid"
                value={formatCurrency(booking.advance_paid)}
              />
            )}
            {typeof booking.balance_due === "number" && (
              <Field
                label="Balance Due"
                value={formatCurrency(booking.balance_due)}
              />
            )}
          </Fields>
        </Section>
      )}

      {/* Payment Details — sourced from the tourist's own invoice */}
      <Section title="Payment Details" icon={CreditCard}>
        {invoiceLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loading payment details…
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            <Fields>
              <Field
                label="Invoice Number"
                value={invoice.invoiceNumber}
                mono
              />
              <Field
                label="Payment Status"
                value={
                  <Badge
                    variant={
                      invoice.paymentInfo.status === "paid"
                        ? "default"
                        : "outline"
                    }
                  >
                    {invoice.paymentInfo.status}
                  </Badge>
                }
              />
              <Field
                label="Amount Paid"
                value={formatCurrency(invoice.paymentInfo.grandTotal, currency)}
              />
              <Field
                label="Payment Method"
                value={invoice.paymentInfo.method || "N/A"}
              />
              <Field
                label="Payment Date"
                value={formatDateTime(invoice.paymentDate)}
              />
              <Field
                label="Payment ID"
                value={invoice.razorpayPaymentId || "N/A"}
                mono
              />
              <Field
                label="Order ID"
                value={invoice.razorpayOrderId || "N/A"}
                mono
              />
              <Field
                label="Transaction ID"
                value={booking.transaction_id}
                mono
              />
            </Fields>

            <Button
              className="h-10 rounded-lg px-5"
              onClick={() =>
                window.open(
                  `${API_BASE}/invoice/${invoice._id}/download`,
                  "_blank",
                )
              }
            >
              <Download aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Download Invoice (PDF)
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Fields>
              <Field label="Transaction ID" value={booking.transaction_id} mono />
              <Field label="Amount" value={formatCurrency(config.price)} />
            </Fields>
            <p className="text-sm leading-relaxed text-slate-500">
              A detailed invoice isn&apos;t available yet. If you just paid, it
              may take a moment to generate — check back shortly.
            </p>
          </div>
        )}
      </Section>

      <BookingActions
        bookingId={booking._id}
        status={booking.status}
        balanceDue={(booking as any).balance_due}
        onChanged={() => dispatch(fetchBookingById(booking._id))}
      />

      {/* No guide, no counterparty — there is nobody on the other end of the
          thread until one is allocated. */}
      {booking.allocated_guide && (
        <BookingChat
          bookingId={booking._id}
          disabled={booking.status === "cancelled"}
          disabledReason="This booking was cancelled, so the conversation is closed."
        />
      )}
    </div>
  );
}
