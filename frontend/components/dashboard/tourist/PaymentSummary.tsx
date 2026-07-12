"use client";

import { useState } from "react";
import { Download, Loader2, Receipt, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/service/api";
import { showToast } from "@/lib/utils/toastHelper";
import type { TouristPaymentSummary } from "@/lib/data";
import { SectionCard } from "./SectionCard";
import { EmptyState } from "./EmptyState";
import { formatCurrency, formatDate } from "./format";
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
    <div className="rounded-xl bg-muted/50 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function PaymentSummary({ payments }: { payments: TouristPaymentSummary }) {
  const [downloading, setDownloading] = useState(false);
  const latest = payments.latestInvoice;

  // The invoice PDF is behind the session cookie, so it can't be a plain <a
  // href> to the API — fetch it through the authenticated client and hand the
  // blob to the browser.
  const downloadLatest = async () => {
    if (!latest) return;
    setDownloading(true);
    try {
      const blob = await apiService.get<Blob>(`/invoice/${latest._id}/download`, {
        responseType: "blob",
      });

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
      contentClassName="p-5"
    >
      {payments.invoiceCount === 0 && payments.pendingAmount === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          description="Once you pay for a booking, your receipts and invoices appear here."
          action={{ label: "Explore Tours", href: "/services" }}
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <Figure label="Total paid" value={formatCurrency(payments.totalPaid)} />
            <Figure
              label="Pending payment"
              value={formatCurrency(payments.pendingAmount)}
              tone={payments.pendingAmount > 0 ? "danger" : undefined}
            />
            <Figure label="Invoices" value={String(payments.invoiceCount)} />
            <Figure
              label="Latest payment"
              value={latest ? formatCurrency(latest.amount, latest.currency) : "—"}
            />
          </dl>

          {latest && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">
                  {latest.invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  {latest.destination ? `${latest.destination} · ` : ""}
                  Paid {formatDate(latest.paidAt)}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={downloadLatest}
                disabled={downloading}
                className="shrink-0"
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
