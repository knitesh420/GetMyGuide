"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, Receipt, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/service/api";
import { showToast } from "@/lib/utils/toastHelper";
import type { FailedPaymentEntry, TouristPaymentSummary } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatCurrency, formatDate } from "./format";
import { CARD_PADDING } from "./ui";
import { cn } from "@/lib/utils";

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-2 truncate text-2xl leading-none font-bold tracking-tight tabular-nums",
          tone === "danger" ? "text-red-600" : "text-slate-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * What the attempt was for. A `pending_*` reference means the checkout was never
 * completed, so there is no booking behind it — the tourist has to start over
 * rather than retry, and the copy says so.
 */
const ATTEMPT_LABEL: Record<string, string> = {
  booking: "Booking payment",
  booking_balance: "Balance payment",
  pending_booking: "Custom booking",
  pending_direct_booking: "Guide booking",
  pending_package_booking: "Package booking",
};

/**
 * Attempts that never became money.
 *
 * These leave no invoice and — for an abandoned checkout — no booking either,
 * so before this the dashboard of someone whose card was declined looked exactly
 * like the dashboard of someone who never tried to pay.
 */
function FailedPayments({ payments }: { payments: FailedPaymentEntry[] }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
      <div className="flex items-center gap-2">
        <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-red-600" />
        <p className="text-sm font-semibold text-red-900">
          {payments.length === 1
            ? "A payment didn't go through"
            : `${payments.length} payments didn't go through`}
        </p>
      </div>

      <ul className="mt-3 space-y-3">
        {payments.map((payment) => (
          <li
            key={payment._id}
            className="flex flex-col gap-1 border-t border-red-200/70 pt-3 first:border-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {formatCurrency(payment.amount, payment.currency)}
                <span className="font-normal text-slate-500">
                  {" · "}
                  {ATTEMPT_LABEL[payment.referenceType] ?? "Payment"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {payment.failure?.description ??
                  payment.failure?.reason ??
                  (payment.status === "pending_verification"
                    ? "Paid, but we're still confirming it — our team is on it."
                    : "The payment was not completed.")}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {formatDate(payment.attemptedAt)}
              </p>
            </div>

            {payment.bookingId ? (
              <Button
                asChild
                variant="outline"
                className="h-8 shrink-0 rounded-lg border-red-200 bg-white text-red-700 hover:bg-red-100"
              >
                <Link href={`/dashboard/user/my-bookings/${payment.bookingId}`}>
                  Try again
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="h-8 shrink-0 rounded-lg border-red-200 bg-white text-red-700 hover:bg-red-100"
              >
                <Link href="/services">Start over</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaymentSummary({
  payments,
}: {
  payments: TouristPaymentSummary;
}) {
  const [downloading, setDownloading] = useState(false);
  const latest = payments.latestInvoice;
  const failed = payments.failedPayments ?? [];

  // A declined payment is still something to report, so it has to hold the card
  // open even when nothing was ever paid and nothing is owed.
  const nothingToShow =
    payments.invoiceCount === 0 &&
    payments.pendingAmount === 0 &&
    failed.length === 0;

  // The invoice PDF is behind the session cookie, so it can't be a plain <a
  // href> to the API — fetch it through the authenticated client and hand the
  // blob to the browser.
  const downloadLatest = async () => {
    if (!latest) return;
    setDownloading(true);
    try {
      const blob = await apiService.get<Blob>(
        `/invoice/${latest._id}/download`,
        {
          responseType: "blob",
        },
      );

      const url = URL.createObjectURL(blob as unknown as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${latest.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast.error("Could not download the invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SectionCard
      icon={Wallet}
      title="Payments"
      description="What you've paid and what's due"
      contentClassName={nothingToShow ? "p-0" : CARD_PADDING}
    >
      {nothingToShow ? (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          description="Once you pay for a booking, your receipts and invoices appear here."
          action={{ label: "Explore Tours", href: "/services" }}
        />
      ) : (
        <div className="space-y-4">
          {failed.length > 0 && <FailedPayments payments={failed} />}

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Figure
              label="Total paid"
              value={formatCurrency(payments.totalPaid)}
            />
            <Figure
              label="Pending payment"
              value={formatCurrency(payments.pendingAmount)}
              tone={payments.pendingAmount > 0 ? "danger" : undefined}
            />
            <Figure label="Invoices" value={String(payments.invoiceCount)} />
            <Figure
              label="Latest payment"
              value={
                latest ? formatCurrency(latest.amount, latest.currency) : "—"
              }
            />
          </dl>

          {latest && (
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate font-mono text-sm font-medium text-slate-900">
                  {latest.invoiceNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {latest.destination ? `${latest.destination} · ` : ""}
                  Paid {formatDate(latest.paidAt)}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={downloadLatest}
                disabled={downloading}
                className="h-9 shrink-0 rounded-lg border-slate-200 text-slate-700 hover:bg-teal-500/10 hover:text-teal-700"
              >
                {downloading ? (
                  <Loader2
                    aria-hidden="true"
                    className="mr-1.5 h-4 w-4 animate-spin"
                  />
                ) : (
                  <Download aria-hidden="true" className="mr-1.5 h-4 w-4" />
                )}
                {downloading ? "Preparing…" : "Download Invoice"}
                <span className="sr-only"> {latest.invoiceNumber} as PDF</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
