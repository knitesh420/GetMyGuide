"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchBookingById } from "@/lib/redux/thunks/booking/bookingThunks";
import { apiService } from "@/lib/service/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  Languages,
  Loader2,
  MapPin,
  ReceiptText,
  User as UserIcon,
  Users,
} from "lucide-react";
import type { AdminBookingSummary } from "@/lib/data";

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
    <div className="flex gap-3">
      <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || "N/A"}</p>
      </div>
    </div>
  );
}

// Compact label/value row used inside the "all fields" sections.
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-semibold break-words">{value}</span>
    </p>
  );
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
          list.find((inv) => (inv.booking?.toString?.() ?? inv.booking) === bookingId) ??
          null;
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
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error Loading Booking</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/user/my-bookings">Go Back</Link>
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Booking not found.
      </div>
    );
  }

  const languages = booking.guide_preferences.guide_language;
  const config = booking.booking_configuration;
  const outstation = config.outstation;
  const isPackage = booking.booking_type === "package";
  const currency = invoice?.paymentInfo.currency || "INR";

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button asChild variant="outline" className="mb-6">
          <Link href="/dashboard/user/my-bookings">Back to My Bookings</Link>
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="p-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-3xl font-extrabold">
                  {booking.travel_details.city}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="w-4 h-4" />
                  {booking.travel_details.places.join(", ")}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-1">
                  Booked on {new Date(booking.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge
                variant={getStatusVariant(booking.status)}
                className="text-base whitespace-nowrap"
              >
                {statusLabel[booking.status] || booking.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <Alert className="bg-primary/10 border-primary/20">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="font-bold">Booking Received</AlertTitle>
              <AlertDescription>
                Your custom tour guide request has been recorded. Our team will
                use these details to coordinate the guide assignment.
              </AlertDescription>
            </Alert>

            <div className="grid gap-6 md:grid-cols-2">
              <DetailItem
                icon={Calendar}
                label="Travel Date"
                value={new Date(
                  booking.travel_details.date,
                ).toLocaleDateString()}
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

            {/* Traveler Information — every field captured on the form */}
            <div>
              <h3 className="font-bold text-xl mb-4">Traveler Information</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <Field label="Name" value={booking.tourist_info.name} />
                <Field label="Email" value={booking.tourist_info.email} />
                <Field label="Phone" value={booking.tourist_info.phone} />
                <Field label="Country" value={booking.tourist_info.country} />
                <Field
                  label="Gender"
                  value={booking.tourist_info.gender || "N/A"}
                />
              </div>
            </div>

            {/* Travel Details */}
            <div>
              <h3 className="font-bold text-xl mb-4">Travel Details</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <Field label="City" value={booking.travel_details.city} />
                <Field
                  label="Places"
                  value={booking.travel_details.places.join(", ")}
                />
                <Field
                  label="Travel Date"
                  value={new Date(
                    booking.travel_details.date,
                  ).toLocaleDateString()}
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
              </div>
            </div>

            {/* Guide Preferences */}
            <div>
              <h3 className="font-bold text-xl mb-4">Guide Preferences</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
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
              </div>
            </div>

            {/* Booking Configuration — full allowance breakdown */}
            <div>
              <h3 className="font-bold text-xl mb-4">Booking Configuration</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
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
                <Field
                  label="Total Fee"
                  value={`Rs. ${config.price.toLocaleString()}`}
                />
              </div>
            </div>

            {outstation && (
              <div>
                <h3 className="font-bold text-xl mb-4">Outstation Details</h3>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
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
                </div>
              </div>
            )}

            {/* Package-specific figures (only present on package bookings) */}
            {isPackage && (
              <div>
                <h3 className="font-bold text-xl mb-4">Package Details</h3>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  {booking.package_info?.title && (
                    <Field label="Package" value={booking.package_info.title} />
                  )}
                  {booking.guide_info?.name && (
                    <Field label="Assigned Guide" value={booking.guide_info.name} />
                  )}
                  {booking.end_date && (
                    <Field
                      label="End Date"
                      value={new Date(booking.end_date).toLocaleDateString()}
                    />
                  )}
                  {typeof booking.advance_paid === "number" && (
                    <Field
                      label="Advance Paid"
                      value={`Rs. ${booking.advance_paid.toLocaleString()}`}
                    />
                  )}
                  {typeof booking.balance_due === "number" && (
                    <Field
                      label="Balance Due"
                      value={`Rs. ${booking.balance_due.toLocaleString()}`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Payment Details — sourced from the tourist's own invoice */}
            <div>
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </h3>

              {invoiceLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading payment
                  details…
                </div>
              ) : invoice ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                    <Field label="Invoice Number" value={invoice.invoiceNumber} />
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
                      value={`${currency} ${invoice.paymentInfo.grandTotal.toLocaleString()}`}
                    />
                    <Field
                      label="Payment Method"
                      value={invoice.paymentInfo.method || "N/A"}
                    />
                    <Field
                      label="Payment Date"
                      value={new Date(invoice.paymentDate).toLocaleString()}
                    />
                    <Field
                      label="Payment ID"
                      value={invoice.razorpayPaymentId || "N/A"}
                    />
                    <Field
                      label="Order ID"
                      value={invoice.razorpayOrderId || "N/A"}
                    />
                    <Field label="Transaction ID" value={booking.transaction_id} />
                  </div>

                  <Button
                    className="mt-5"
                    onClick={() =>
                      window.open(
                        `${API_BASE}/invoice/${invoice._id}/download`,
                        "_blank",
                      )
                    }
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice (PDF)
                  </Button>
                </>
              ) : (
                <div className="text-sm text-muted-foreground grid gap-4 md:grid-cols-2">
                  <Field label="Transaction ID" value={booking.transaction_id} />
                  <Field
                    label="Amount"
                    value={`Rs. ${config.price.toLocaleString()}`}
                  />
                  <p className="md:col-span-2 text-muted-foreground">
                    A detailed invoice isn&apos;t available yet. If you just paid,
                    it may take a moment to generate — check back shortly.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
