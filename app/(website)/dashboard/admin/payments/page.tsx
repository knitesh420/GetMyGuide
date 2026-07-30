"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Download, Receipt, Send } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  InvoiceStatus,
  InvoiceType,
  fetchInvoices,
  resendInvoice,
} from "@/lib/redux/thunks/invoice/invoiceThunks";
import { PageHeader, EmptyState, AdminStatusBadge } from "@/components/admin/ui";
import FailedPaymentsTable from "@/components/admin/FailedPaymentsTable";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const TYPE_LABEL: Record<string, string> = {
  booking: "Booking",
  guide_membership: "Membership",
  trip_completion: "Trip",
};

const TYPE_FILTERS: { label: string; value?: InvoiceType }[] = [
  { label: "All types" },
  { label: "Bookings", value: "booking" },
  { label: "Memberships", value: "guide_membership" },
  { label: "Trips", value: "trip_completion" },
];

const STATUS_FILTERS: { label: string; value?: InvoiceStatus }[] = [
  { label: "All", value: undefined },
  { label: "Paid", value: "paid" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

/**
 * Pull a file from an endpoint that requires a session. The invoice PDF and the
 * CSV export are both plain authenticated GETs that return a binary body, so
 * they can't be an `<a download>` — fetch with the session cookie, then hand the
 * blob to a throwaway anchor.
 */
async function downloadWithSession(path: string, filename: string) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
      toast.error(`Download failed (${res.status}).`);
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  } catch {
    toast.error("Could not download the file.");
  }
}

/**
 * An invoice only exists once money has arrived, so the invoice list can never
 * show a payment that failed. The two tabs are the two halves of the ledger.
 */
type View = "invoices" | "failed";

export default function AdminPaymentsPage() {
  const dispatch = useAppDispatch();
  const { invoices, total, loading, resending, error } = useAppSelector(
    (state) => state.invoices,
  );

  const [view, setView] = useState<View>("invoices");
  const [invoiceType, setInvoiceType] = useState<InvoiceType | undefined>();
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [search, setSearch] = useState("");
  // Only the submitted search hits the API — typing shouldn't fire a request per
  // keystroke, and the admin here is looking up a known invoice or customer.
  const [submittedSearch, setSubmittedSearch] = useState("");

  useEffect(() => {
    if (view !== "invoices") return;
    dispatch(fetchInvoices({ invoiceType, status, search: submittedSearch }));
  }, [dispatch, view, invoiceType, status, submittedSearch]);

  const handleResend = async (invoiceId: string, email: string) => {
    const result = await dispatch(resendInvoice(invoiceId));
    if (resendInvoice.fulfilled.match(result)) {
      toast.success(`Invoice emailed to ${email}.`);
    } else {
      toast.error(
        (result.payload as string) || "Could not resend the invoice.",
      );
    }
  };

  const handleExport = () => {
    const query = new URLSearchParams({ format: "csv" });
    if (invoiceType) query.set("invoiceType", invoiceType);
    if (status) query.set("status", status);
    if (submittedSearch) query.set("search", submittedSearch);
    downloadWithSession(`/invoice/admin/export?${query}`, "invoices.csv");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={
          view === "invoices"
            ? `Every invoice raised on the platform${total ? ` — ${total} in total` : ""}.`
            : "Payments the gateway declined, and payments that cleared but were never fully processed."
        }
      >
        {view === "invoices" && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </PageHeader>

      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {(
          [
            { label: "Invoices", value: "invoices" },
            { label: "Failed payments", value: "failed" },
          ] as { label: string; value: View }[]
        ).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setView(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "failed" ? (
        <FailedPaymentsTable />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setInvoiceType(filter.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  invoiceType === filter.value
                    ? "bg-teal-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}

            <span className="mx-1 h-5 w-px bg-slate-200" />

            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setStatus(filter.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  status === filter.value
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}

            <form
              className="ml-auto flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedSearch(search.trim());
              }}
            >
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice number, name or email"
                className="w-64"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading && invoices.length === 0 ? (
            <SkeletonTable rows={8} columns={7} />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments match these filters"
              description="Invoices are raised automatically when a booking or membership is paid for."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-slate-400">
                          {shortDate(invoice.invoiceDate)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {TYPE_LABEL[invoice.invoiceType] ?? invoice.invoiceType}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {invoice.customerSnapshot?.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {invoice.customerSnapshot?.email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                        {currency.format(
                          invoice.paymentInfo?.grandTotal ??
                            invoice.paymentInfo?.amount ??
                            0,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <AdminStatusBadge
                          status={invoice.status}
                          tone={
                            invoice.status === "paid"
                              ? "success"
                              : invoice.status === "refunded"
                                ? "warning"
                                : "neutral"
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {shortDate(invoice.paymentDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Download PDF"
                            onClick={() =>
                              downloadWithSession(
                                `/invoice/${invoice._id}/download`,
                                `${invoice.invoiceNumber}.pdf`,
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Email to customer"
                            disabled={resending}
                            onClick={() =>
                              handleResend(
                                invoice._id,
                                invoice.customerSnapshot?.email ??
                                  "the customer",
                              )
                            }
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
