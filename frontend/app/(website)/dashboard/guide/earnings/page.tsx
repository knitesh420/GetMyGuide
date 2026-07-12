"use client";

import { useEffect } from "react";
import { Banknote, Clock, Hourglass, Receipt, Wallet } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchMyEarnings, fetchMyPayouts } from "@/lib/redux/thunks/earning/earningThunks";
import {
  GuideCellStack,
  GuideEmptyState,
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatCard,
  GuideStatusBadge,
  GuideTable,
  GuideTableCell,
  GuideTableHead,
  GuideTableRow,
  GuideToolbar,
} from "@/components/guide";
import { Skeleton } from "@/components/ui/skeleton";

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

/**
 * GuideStatusBadge keys off the raw API status, and 'pending'/'paid' already
 * carry the right tone there. Only 'payable' needs a friendlier word than the
 * database's — "Ready to pay" says what the guide actually wants to know.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: "on-hold",
  payable: "upcoming",
  paid: "completed",
  reversed: "cancelled",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "On hold",
  payable: "Ready to pay",
  paid: "Paid",
  reversed: "Reversed",
};

/**
 * The guide's ledger. Every completed trip credits an earning here, minus the
 * platform commission. It sits on hold for a few days — long enough for a
 * dispute or refund to reverse it — then becomes payable and shows up in the
 * admin's payout queue.
 *
 * Payouts are made by hand (bank transfer or UPI) and recorded against a
 * reference. Nothing on this page moves money.
 */
export default function GuideEarningsPage() {
  const dispatch = useAppDispatch();
  const { earnings, summary, payouts, loading, error } = useAppSelector(
    (state) => state.earnings,
  );

  useEffect(() => {
    dispatch(fetchMyEarnings());
    dispatch(fetchMyPayouts());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="My Earnings"
        description="What you have earned from completed trips, and what has been paid out."
      />

      {loading && !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GuideStatCard
            icon={Wallet}
            label="Outstanding"
            value={currency.format(summary.outstandingAmount)}
            hint="Everything you are still owed"
          />
          <GuideStatCard
            icon={Hourglass}
            label="On hold"
            value={currency.format(summary.pendingAmount)}
            hint={`${summary.pendingCount} trip${summary.pendingCount === 1 ? "" : "s"} in the hold window`}
          />
          <GuideStatCard
            icon={Clock}
            label="Ready to pay"
            value={currency.format(summary.payableAmount)}
            hint="Queued for the next payout run"
          />
          <GuideStatCard
            icon={Banknote}
            label="Paid to date"
            value={currency.format(summary.paidAmount)}
            hint={`${summary.paidCount} settled earning${summary.paidCount === 1 ? "" : "s"}`}
          />
        </div>
      ) : null}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <GuidePanel>
        <GuideToolbar
          stats={
            summary ? (
              <GuideStat
                icon={Banknote}
                label="Lifetime"
                value={currency.format(summary.lifetimeAmount)}
                accent
              />
            ) : undefined
          }
        >
          <h2 className="text-sm font-semibold text-slate-900">Earnings</h2>
        </GuideToolbar>

        {loading && earnings.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : earnings.length === 0 ? (
          <GuideEmptyState
            icon={Wallet}
            title="No earnings yet"
            description="Complete a trip and your share of the booking will appear here."
          />
        ) : (
          <GuideTable>
            <GuideTableHead
              columns={[
                "Trip",
                "Completed",
                "Booking value",
                "Commission",
                "You earn",
                "Status",
              ]}
            />
            <tbody>
              {earnings.map((earning) => (
                <GuideTableRow key={earning._id}>
                  <GuideTableCell>
                    <GuideCellStack
                      primary={earning.trip?.tripCode ?? earning.earningCode ?? "—"}
                      secondary={earning.booking?.travel_details?.city}
                    />
                  </GuideTableCell>
                  <GuideTableCell>{shortDate(earning.trip?.completedAt)}</GuideTableCell>
                  <GuideTableCell>{currency.format(earning.grossAmount)}</GuideTableCell>
                  <GuideTableCell className="text-slate-500">
                    −{currency.format(earning.commissionAmount)}
                    <span className="block text-xs">({earning.commissionRate}%)</span>
                  </GuideTableCell>
                  <GuideTableCell className="font-semibold text-slate-900">
                    {currency.format(earning.netAmount)}
                  </GuideTableCell>
                  <GuideTableCell last>
                    <GuideStatusBadge status={STATUS_LABEL[earning.status] ?? earning.status} />
                    <span className="mt-1 block text-xs text-slate-500">
                      {earning.status === "pending"
                        ? `payable ${shortDate(earning.payableAt)}`
                        : STATUS_TEXT[earning.status]}
                    </span>
                  </GuideTableCell>
                </GuideTableRow>
              ))}
            </tbody>
          </GuideTable>
        )}
      </GuidePanel>

      <GuidePanel>
        <GuideToolbar>
          <h2 className="text-sm font-semibold text-slate-900">Payouts</h2>
        </GuideToolbar>

        {payouts.length === 0 ? (
          <GuideEmptyState
            icon={Receipt}
            title="No payouts yet"
            description="Once your earnings clear the hold window we settle them, and the transfer is recorded here."
          />
        ) : (
          <GuideTable>
            <GuideTableHead columns={["Payout", "Date", "Method", "Reference", "Amount"]} />
            <tbody>
              {payouts.map((payout) => (
                <GuideTableRow key={payout._id}>
                  <GuideTableCell className="font-semibold text-slate-900">
                    {payout.payoutCode ?? "—"}
                  </GuideTableCell>
                  <GuideTableCell>{shortDate(payout.paidAt)}</GuideTableCell>
                  <GuideTableCell className="capitalize">
                    {payout.method.replace("_", " ")}
                  </GuideTableCell>
                  <GuideTableCell className="font-mono text-xs">
                    {payout.reference}
                  </GuideTableCell>
                  <GuideTableCell last className="font-semibold text-slate-900">
                    {currency.format(payout.amount)}
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
