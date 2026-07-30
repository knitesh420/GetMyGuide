"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  RefundRequest,
  RefundStatus,
  approveRefund,
  fetchRefunds,
  rejectRefund,
  retryRefund,
} from "@/lib/redux/thunks/refund/refundThunks";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPanel,
  AdminStatusBadge,
  EmptyState,
  PageHeader,
} from "@/components/admin/ui";
import { SkeletonList } from "@/components/animations/Skeletons";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

const TABS: { label: string; status?: RefundStatus }[] = [
  { label: "Awaiting decision", status: "pending" },
  { label: "Processed", status: "processed" },
  { label: "Declined", status: "rejected" },
  { label: "Failed", status: "failed" },
  { label: "All" },
];

const REFUND_TONE: Record<RefundStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  processed: "success",
  rejected: "neutral",
  failed: "danger",
};

/**
 * Decide one request. The amount is free-form up to what the tourist actually
 * paid — there is no automatic policy engine, by design: every refund is an
 * explicit human decision, and this is where it gets made.
 */
function DecisionRow({ request }: { request: RefundRequest }) {
  const dispatch = useAppDispatch();
  const { deciding } = useAppSelector((state) => state.refunds);

  const [amount, setAmount] = useState(String(request.amountPaid));
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");

  const handleApprove = async () => {
    const approvedAmount = Number(amount);
    if (Number.isNaN(approvedAmount) || approvedAmount < 0) {
      toast.error("Enter a refund amount of zero or more.");
      return;
    }
    if (approvedAmount > request.amountPaid) {
      toast.error(`The refund cannot exceed the ${currency.format(request.amountPaid)} paid.`);
      return;
    }

    const result = await dispatch(
      approveRefund({ refundId: request._id, approvedAmount, adminNote: note || undefined }),
    );

    if (approveRefund.fulfilled.match(result)) {
      toast.success(
        approvedAmount > 0
          ? `Booking cancelled and ${currency.format(approvedAmount)} refunded.`
          : "Booking cancelled with no refund.",
      );
      setMode("none");
    } else {
      toast.error((result.payload as string) || "Could not approve the refund.");
    }
  };

  const handleReject = async () => {
    if (note.trim().length < 5) {
      toast.error("Tell the tourist why the request was declined.");
      return;
    }

    const result = await dispatch(rejectRefund({ refundId: request._id, adminNote: note }));
    if (rejectRefund.fulfilled.match(result)) {
      toast.success("Request declined. The booking stays live.");
      setMode("none");
    } else {
      toast.error((result.payload as string) || "Could not decline the request.");
    }
  };

  if (mode === "none") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>
          Approve & refund
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode("reject")}>
          Decline
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      {mode === "approve" && (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">
            Refund amount (paid: {currency.format(request.amountPaid)})
          </span>
          <input
            type="number"
            min={0}
            max={request.amountPaid}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
          <span className="text-xs text-slate-500">
            Enter 0 to cancel the booking without refunding anything.
          </span>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">
          Note to the tourist {mode === "reject" && <span className="text-red-500">*</span>}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-2.5 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={deciding}
          onClick={mode === "approve" ? handleApprove : handleReject}
          variant={mode === "reject" ? "destructive" : "default"}
        >
          {deciding ? "Working…" : mode === "approve" ? "Confirm refund" : "Confirm decline"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function AdminRefundsPage() {
  const dispatch = useAppDispatch();
  const { requests, loading, deciding, error } = useAppSelector((state) => state.refunds);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    dispatch(fetchRefunds({ status: TABS[tab].status }));
  }, [dispatch, tab]);

  const handleRetry = async (refundId: string) => {
    const result = await dispatch(retryRefund(refundId));
    if (retryRefund.fulfilled.match(result)) {
      toast.success("Refund retried.");
    } else {
      toast.error((result.payload as string) || "The refund failed again.");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Cancellations & Refunds"
        description="Every cancellation lands here. Nothing is cancelled and no money moves until you decide."
      />

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((entry, index) => (
          <button
            key={entry.label}
            onClick={() => setTab(index)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === index
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading && requests.length === 0 ? (
        <SkeletonList rows={3} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing here"
          description="Cancellation and refund requests will appear here as tourists submit them."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <AdminPanel key={request._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">
                      {request.booking?.bookingCode ?? "Booking"}
                    </h2>
                    <AdminStatusBadge
                      status={request.status}
                      tone={REFUND_TONE[request.status]}
                    />
                    <span className="text-xs text-slate-400">
                      {request.refundCode} · {shortDate(request.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {request.booking?.tourist_info?.name ?? "Tourist"} ·{" "}
                    {request.booking?.travel_details?.city ?? "—"} ·{" "}
                    {shortDate(request.booking?.travel_details?.date)}
                  </p>

                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">Reason: </span>
                    {request.reason}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="text-lg font-bold text-slate-900">
                    {currency.format(request.amountPaid)}
                  </p>
                  {request.approvedAmount !== undefined && (
                    <p className="mt-1 text-xs text-green-600">
                      Refunded {currency.format(request.approvedAmount)}
                    </p>
                  )}
                </div>
              </div>

              {request.status === "failed" && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    The booking was cancelled, but Razorpay refused at least one refund leg
                    {request.refunds.find((leg) => leg.failureReason)
                      ? `: ${request.refunds.find((leg) => leg.failureReason)?.failureReason}`
                      : "."}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deciding}
                    onClick={() => handleRetry(request._id)}
                  >
                    <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              )}

              {request.adminNote && request.status !== "pending" && (
                <p className="mt-3 text-sm text-slate-500">
                  <span className="font-medium">Your note: </span>
                  {request.adminNote}
                </p>
              )}

              {request.status === "pending" && (
                <div className="mt-4">
                  <DecisionRow request={request} />
                </div>
              )}
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
