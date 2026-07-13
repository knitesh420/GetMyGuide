"use client";

import { useEffect } from "react";
import { Coins, Receipt, Wallet } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchMyCashPayments } from "@/lib/redux/thunks/cashPayment/cashPaymentThunks";
import {
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatStrip,
} from "@/components/guide";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Cash payments an admin has recorded against this guide — money handed over in
 * person, by a tourist at the end of a trip or by the office.
 *
 * This is deliberately separate from "My Earnings", which is the commission
 * ledger for online bookings. A cash payment is money the guide already has;
 * an earning is money still owed to them. Merging the two would misstate both.
 *
 * Voided records are filtered out server-side, so anything shown here counts.
 */
export default function GuidePaymentHistoryPage() {
  const dispatch = useAppDispatch();
  const { payments, summary, loading } = useAppSelector((state) => state.cashPayments);

  useEffect(() => {
    dispatch(fetchMyCashPayments());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="Payment History"
        description="Cash payments recorded against your account by the Get My Guide team."
      />

      <GuidePanel>
        <div className="border-b border-slate-200 px-5 py-4">
          <GuideStatStrip>
            <GuideStat
              icon={Wallet}
              label="Total Received"
              value={rupees.format(summary.totalAmount)}
              accent
            />
            <GuideStat icon={Receipt} label="Payments" value={String(summary.count)} />
            <GuideStat
              icon={Coins}
              label="Method"
              value={summary.count > 0 ? "Cash" : "—"}
            />
          </GuideStatStrip>
        </div>

        <div className="p-5">
          {loading && payments.length === 0 ? (
            <Skeleton className="h-40" />
          ) : payments.length === 0 ? (
            <div className="py-10 text-center">
              <Coins className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-900">No cash payments yet</p>
              <p className="mt-1 text-sm text-slate-500">
                When you are paid in cash and the team records it, it will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Reference</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Method</th>
                    <th className="pb-2 pr-4 font-medium">Paid by</th>
                    <th className="pb-2 pr-4 font-medium">Remarks</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p._id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {p.cashPaymentCode ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">{shortDate(p.paymentDate)}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">
                        {rupees.format(p.amount)}
                      </td>
                      <td className="py-2.5 pr-4 capitalize">{p.method}</td>
                      <td className="py-2.5 pr-4 capitalize">{p.paidBy}</td>
                      <td className="max-w-[260px] truncate py-2.5 pr-4" title={p.remarks}>
                        {p.remarks || "—"}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="success">Received</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GuidePanel>
    </div>
  );
}
