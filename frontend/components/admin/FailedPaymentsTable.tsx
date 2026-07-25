"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TriangleAlert } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  FailedPaymentStatus,
  fetchFailedPayments,
} from "@/lib/redux/thunks/payment/failedPaymentThunks";
import { EmptyState, AdminStatusBadge } from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const stamp = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/**
 * A `pending_*` reference type means the customer never got as far as a saved
 * booking — the order was created, the payment failed, and nothing else about
 * the attempt exists. Worth spelling out, because those rows have no booking to
 * click through to.
 */
const REFERENCE_LABEL: Record<string, string> = {
  guide_membership: "Guide membership",
  booking: "Booking",
  booking_balance: "Balance payment",
  pending_booking: "Booking (never saved)",
  pending_direct_booking: "Guide booking (never saved)",
  pending_package_booking: "Package booking (never saved)",
};

const STATUS_LABEL: Record<string, string> = {
  failed: "Declined",
  pending_verification: "Needs checking",
};

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";
const STATUS_TONE: Record<string, BadgeTone> = {
  failed: "danger",
  pending_verification: "warning",
};

const STATUS_FILTERS: { label: string; value?: FailedPaymentStatus }[] = [
  { label: "All" },
  { label: "Declined", value: "failed" },
  { label: "Needs checking", value: "pending_verification" },
];

/**
 * Payments that never landed.
 *
 * The Invoices tab next door can only ever show money that arrived — an invoice
 * is raised on success. This is the other half of the ledger, and the only
 * place a declined card is visible outside the server logs.
 */
export default function FailedPaymentsTable() {
  const dispatch = useAppDispatch();
  const { payments, total, loading, error } = useAppSelector(
    (state) => state.failedPayments,
  );

  const [status, setStatus] = useState<FailedPaymentStatus | undefined>();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  useEffect(() => {
    dispatch(fetchFailedPayments({ status, search: submittedSearch }));
  }, [dispatch, status, submittedSearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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
            placeholder="Name, email, phone or payment ID"
            className="w-64"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {total > 0 && (
        <p className="text-sm text-slate-500">
          {total} unsuccessful payment{total === 1 ? "" : "s"}.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && payments.length === 0 ? (
        <SkeletonTable rows={8} columns={6} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="No failed payments match these filters"
          description="Declined cards and abandoned checkouts land here as soon as Razorpay reports them."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Attempted</th>
                <th className="px-4 py-3 font-semibold">For</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr
                  key={payment._id}
                  className="align-top hover:bg-slate-50/70"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="text-slate-700">
                      {stamp(payment.attemptedAt)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {payment.paymentCode ??
                        payment.razorpay_payment_id ??
                        payment.razorpay_order_id}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {REFERENCE_LABEL[payment.referenceType] ??
                      payment.referenceType}
                  </td>
                  <td className="px-4 py-3">
                    {payment.customer?.name || payment.customer?.email ? (
                      <>
                        <p className="font-medium text-slate-800">
                          {payment.customer.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.customer.email}
                        </p>
                        {payment.customer.phone && (
                          <p className="text-xs text-slate-400">
                            {payment.customer.phone}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Not recorded
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                    {currency.format(payment.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <AdminStatusBadge
                      status={payment.status}
                      tone={STATUS_TONE[payment.status] ?? "neutral"}
                      label={STATUS_LABEL[payment.status] ?? payment.status}
                    />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {payment.failure ? (
                      <>
                        <p className="text-slate-700">
                          {payment.failure.description ??
                            payment.failure.reason ??
                            payment.failure.code}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[
                            payment.failure.code,
                            payment.failure.method,
                            payment.failure.step,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </>
                    ) : payment.status === "pending_verification" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Paid, but follow-up never completed
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        No reason given
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
