"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Banknote, Copy, Info } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  PayoutQueueRow,
  fetchAllPayouts,
  fetchPayoutQueue,
  recordPayout,
} from "@/lib/redux/thunks/earning/earningThunks";
import { Button } from "@/components/ui/button";
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

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

/**
 * Record a transfer that has already happened. This form does NOT send money —
 * the admin pays the guide out-of-band (NEFT, UPI, cash) and then closes the
 * ledger here against the reference that proves it, which is why `reference` is
 * mandatory.
 */
function SettleForm({ row, onDone }: { row: PayoutQueueRow; onDone: () => void }) {
  const dispatch = useAppDispatch();
  const { recording } = useAppSelector((state) => state.earnings);

  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>(
    row.bankDetails?.upiId && !row.bankDetails?.accountNumber ? "upi" : "bank_transfer",
  );
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    if (reference.trim().length < 3) {
      toast.error("Enter the transfer reference (bank UTR or UPI transaction id).");
      return;
    }

    const result = await dispatch(
      recordPayout({
        guideId: row.guideId,
        earningIds: row.earningIds,
        method,
        reference: reference.trim(),
        note: note.trim() || undefined,
      }),
    );

    if (recordPayout.fulfilled.match(result)) {
      toast.success(`Recorded ${currency.format(row.amount)} paid to ${row.name}.`);
      onDone();
    } else {
      toast.error((result.payload as string) || "Could not record the payout.");
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
      <p className="flex items-start gap-2 text-xs text-slate-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Send the money first, then record it here. This closes {row.earningCount} earning
        {row.earningCount === 1 ? "" : "s"} — it does not transfer anything.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            {METHODS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-500">
            Reference (UTR / UPI txn id) <span className="text-red-500">*</span>
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. N123456789012345"
            className="w-full rounded-md border px-2.5 py-1.5 font-mono text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border px-2.5 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <Button size="sm" disabled={recording} onClick={handleSubmit}>
          <Banknote className="mr-1.5 h-4 w-4" />
          {recording ? "Recording…" : `Mark ${currency.format(row.amount)} as paid`}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const dispatch = useAppDispatch();
  const { payoutQueue, payouts, loading, error } = useAppSelector((state) => state.earnings);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchPayoutQueue());
    dispatch(fetchAllPayouts());
  }, [dispatch]);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const totalOwed = payoutQueue.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guide Payouts</h1>
          <p className="text-muted-foreground">
            Guides whose earnings have cleared the hold window. Pay them, then record the transfer.
          </p>
        </div>
        {payoutQueue.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Total owed</p>
            <p className="text-2xl font-bold text-slate-900">{currency.format(totalOwed)}</p>
          </div>
        )}
      </header>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Awaiting payout</h2>

        {loading && payoutQueue.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : payoutQueue.length === 0 ? (
          <p className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-slate-500">
            Nobody is owed anything right now.
          </p>
        ) : (
          payoutQueue.map((row) => (
            <article key={row.guideId} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    {row.name}{" "}
                    <span className="text-xs font-normal text-slate-400">{row.guideCode}</span>
                  </h3>
                  <p className="text-sm text-slate-500">
                    {row.email} · {row.phone}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.earningCount} earning{row.earningCount === 1 ? "" : "s"} · oldest since{" "}
                    {shortDate(row.oldestPayableAt)}
                  </p>

                  {row.bankDetails ? (
                    <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      {row.bankDetails.accountNumber && (
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500">A/C</span>
                          <span className="font-mono">{row.bankDetails.accountNumber}</span>
                          <span className="text-slate-500">IFSC</span>
                          <span className="font-mono">{row.bankDetails.ifsc}</span>
                          <button
                            onClick={() => copy(row.bankDetails!.accountNumber!)}
                            className="text-slate-400 hover:text-slate-700"
                            aria-label="Copy account number"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </p>
                      )}
                      {row.bankDetails.accountHolderName && (
                        <p className="text-slate-600">{row.bankDetails.accountHolderName}</p>
                      )}
                      {row.bankDetails.upiId && (
                        <p className="flex items-center gap-2">
                          <span className="text-slate-500">UPI</span>
                          <span className="font-mono">{row.bankDetails.upiId}</span>
                          <button
                            onClick={() => copy(row.bankDetails!.upiId!)}
                            className="text-slate-400 hover:text-slate-700"
                            aria-label="Copy UPI ID"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This guide has not given us any payout details yet. Ask them to add a bank
                      account or UPI ID before you pay.
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="text-2xl font-bold text-slate-900">{currency.format(row.amount)}</p>
                  {openGuideId !== row.guideId && (
                    <Button size="sm" onClick={() => setOpenGuideId(row.guideId)}>
                      Record payout
                    </Button>
                  )}
                </div>
              </div>

              {openGuideId === row.guideId && (
                <SettleForm row={row} onDone={() => setOpenGuideId(null)} />
              )}
            </article>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Payout history</h2>

        {payouts.length === 0 ? (
          <p className="rounded-xl border bg-white px-6 py-12 text-center text-sm text-slate-500">
            No payouts recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Payout</th>
                  <th className="px-4 py-3 font-medium">Guide</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout._id} className="border-t">
                    <td className="px-4 py-3 font-medium">{payout.payoutCode ?? "—"}</td>
                    <td className="px-4 py-3">{payout.guide?.name ?? "—"}</td>
                    <td className="px-4 py-3">{shortDate(payout.paidAt)}</td>
                    <td className="px-4 py-3 capitalize">{payout.method.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{payout.reference}</td>
                    <td className="px-4 py-3 font-semibold">{currency.format(payout.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
