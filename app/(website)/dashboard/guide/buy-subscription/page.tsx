// app/(website)/dashboard/guide/buy-subscription/page.tsx
"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AppDispatch, RootState } from "@/lib/store";
import {
  getMyGuideProfile,
  createGuideMembershipOrder,
  confirmGuideMembershipPayment,
  fetchGuideSubscriptionHistory,
} from "@/lib/redux/thunks/guide/guideThunk";
import type { GuideSubscriptionRecord } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentStatusOverlay from "@/components/animations/PaymentStatusOverlay";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";
import {
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Hourglass,
  History,
  ChevronDown,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatStrip,
  GuideEmptyState,
} from "@/components/guide";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const rupees = (amount: number) => `₹${(amount ?? 0).toLocaleString("en-IN")}`;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const STATUS_STYLES: Record<GuideSubscriptionRecord["status"], string> = {
  Active: "bg-green-50 text-green-700 ring-green-200",
  Expired: "bg-slate-100 text-slate-600 ring-slate-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Cancelled: "bg-red-50 text-red-700 ring-red-200",
  // Distinct from Pending on purpose: a declined payment used to show as
  // "Pending", which read as "still processing" and gave the guide no reason to
  // try again.
  Failed: "bg-red-50 text-red-700 ring-red-200",
};

function StatusBadge({
  status,
}: {
  status: GuideSubscriptionRecord["status"];
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

/** Stream an invoice PDF down, sending the session cookie with the request. */
async function downloadInvoice(record: GuideSubscriptionRecord) {
  if (!record.invoiceId) return;
  try {
    const res = await fetch(
      `${API_BASE_URL}/invoice/${record.invoiceId}/download`,
      {
        credentials: "include",
      },
    );
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.invoiceNumber || "invoice"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Could not download the invoice. Please try again.");
  }
}

function SubscriptionHistorySection({
  reloadToken,
  onRenew,
  canRenew,
}: {
  reloadToken: number;
  onRenew: () => void;
  canRenew: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [records, setRecords] = useState<GuideSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await dispatch(fetchGuideSubscriptionHistory());
    if (fetchGuideSubscriptionHistory.fulfilled.match(result)) {
      setRecords(result.payload);
    }
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  return (
    <GuidePanel>
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <History className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">
          Subscription History
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : records.length === 0 ? (
        <GuideEmptyState
          icon={History}
          title="No subscriptions yet"
          description="Once you pay your membership fee, every payment and renewal will appear here."
        />
      ) : (
        <>
          {/* Table on md+, stacked cards on mobile. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400">
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Purchased</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {r.plan}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatDate(r.purchaseDate)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {rupees(r.amount)}
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600">
                        {r.paymentStatus}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                        {r.status === "Failed" && (
                          <p className="mt-1 max-w-[16rem] text-xs text-red-700">
                            {r.failureReason ??
                              "The payment did not complete. Please try again."}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setExpanded(expanded === r.id ? null : r.id)
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expanded === r.id ? "rotate-180" : ""
                              }`}
                            />
                            Details
                          </Button>
                          {r.invoiceId && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadInvoice(r)}
                            >
                              <Download className="h-4 w-4" />
                              Invoice
                            </Button>
                          )}
                          {(r.status === "Expired" || r.status === "Failed") &&
                            canRenew && (
                              <Button type="button" size="sm" onClick={onRenew}>
                                <RefreshCw className="h-4 w-4" />
                                {r.status === "Failed" ? "Try again" : "Renew"}
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-5 py-4">
                          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
                            <Detail
                              label="Activation Date"
                              value={formatDate(r.activationDate)}
                            />
                            <Detail
                              label="Expiry Date"
                              value={formatDate(r.expiryDate)}
                            />
                            <Detail
                              label="Duration"
                              value={
                                r.durationDays ? `${r.durationDays} days` : "—"
                              }
                            />
                            <Detail
                              label="Payment Method"
                              value={r.paymentMethod || "—"}
                              capitalize
                            />
                            <Detail
                              label="Transaction ID"
                              value={r.transactionId}
                              mono
                            />
                            <Detail
                              label="Invoice No."
                              value={r.invoiceNumber || "—"}
                              mono
                            />
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {records.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {r.plan}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.purchaseDate)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Amount: {rupees(r.amount)}</span>
                  <span className="capitalize">Payment: {r.paymentStatus}</span>
                  <span>Activated: {formatDate(r.activationDate)}</span>
                  <span>Expires: {formatDate(r.expiryDate)}</span>
                </div>
                {r.status === "Failed" && (
                  <p className="mt-2 text-xs text-red-700">
                    {r.failureReason ??
                      "The payment did not complete. Please try again."}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.invoiceId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadInvoice(r)}
                    >
                      <Download className="h-4 w-4" />
                      Invoice
                    </Button>
                  )}
                  {(r.status === "Expired" || r.status === "Failed") &&
                    canRenew && (
                      <Button type="button" size="sm" onClick={onRenew}>
                        <RefreshCw className="h-4 w-4" />
                        {r.status === "Failed" ? "Try again" : "Renew"}
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </GuidePanel>
  );
}

function Detail({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd
        className={`mt-0.5 font-medium text-slate-800 ${mono ? "break-all font-mono" : ""} ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/** Matches the guide panel's green accent rather than the app's red brand. */
const RAZORPAY_THEME_COLOR = "#22C55E";

export default function GuideMembershipPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { myProfile: profile, loading } = useSelector(
    (state: RootState) => state.guide,
  );
  const [processing, setProcessing] = useState(false);
  // Bumped after a successful payment so the history section refetches.
  const [historyReload, setHistoryReload] = useState(0);
  // Full-screen membership payment animation. Reporting only — the order and
  // confirmation calls below are unchanged.
  const membershipPayment = usePaymentStatus();
  const { start, succeed, fail, cancel, reset } = membershipPayment;

  useEffect(() => {
    dispatch(getMyGuideProfile());
  }, [dispatch]);

  const isActive =
    profile?.isVisible &&
    !profile?.membershipExpired &&
    !!profile?.membershipExpiryDate;
  /**
   * Paid, but the 30-day clock has not started: the guide is waiting on the
   * admin's verification, and their subscription begins the moment it lands.
   *
   * Without this the page cannot tell "has not paid" from "paid and waiting" —
   * both have no expiry date — and would push a guide who has already paid to
   * pay a second time.
   */
  const awaitingApproval = !!profile?.membershipPendingActivation;
  const expiryDate = profile?.membershipExpiryDate
    ? new Date(profile.membershipExpiryDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const paidOn = profile?.membershipPaidAt
    ? new Date(profile.membershipPaidAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handlePay = async () => {
    if (!profile?.registrationCompleted) {
      toast.error(
        "Please complete your guide profile before paying for membership.",
      );
      return;
    }

    setProcessing(true);
    start();
    const orderResult = await dispatch(createGuideMembershipOrder());
    if (createGuideMembershipOrder.rejected.match(orderResult)) {
      // Nothing charged yet — safely retryable.
      fail("failed", {
        reason: (orderResult.payload as string) || "Failed to start payment.",
      });
      setProcessing(false);
      return;
    }

    const { transaction_id, razorpay_options } = orderResult.payload;

    const options = {
      key: razorpay_options.key,
      amount: razorpay_options.amount,
      currency: razorpay_options.currency,
      name: razorpay_options.name,
      description: razorpay_options.description,
      order_id: razorpay_options.order_id,
      prefill: razorpay_options.prefill,
      theme: { color: RAZORPAY_THEME_COLOR },
      handler: async (response: any) => {
        // Captured — from here a failure means "paid, not confirmed".
        start();
        const confirmResult = await dispatch(
          confirmGuideMembershipPayment({
            transaction_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        );

        if (confirmGuideMembershipPayment.fulfilled.match(confirmResult)) {
          dispatch(getMyGuideProfile());
          // Surface the new payment in the history table below.
          setHistoryReload((n) => n + 1);
          succeed({
            amount: razorpay_options.amount / 100,
            reference: response.razorpay_payment_id,
          });
        } else {
          fail("verification-failed", {
            reason:
              (confirmResult.payload as string) ||
              "Payment succeeded but confirmation failed — please contact support.",
            reference: response.razorpay_payment_id,
          });
        }
        setProcessing(false);
      },
      // Without this a dismissed sheet left the button latched on "Processing…"
      // with no way back.
      modal: {
        ondismiss: () => {
          setProcessing(false);
          cancel();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response: any) => {
      fail("failed", {
        reason: response.error?.description || "Please try again.",
      });
      setProcessing(false);
    });
    rzp.open();
  };

  const ctaLabel = processing
    ? "Processing..."
    : isActive
      ? "Renew Early (+30 days)"
      : awaitingApproval
        ? "Awaiting Verification"
        : profile?.membershipStartDate
          ? "Renew Membership"
          : "Pay Membership Fee";

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
      />

      <PaymentStatusOverlay
        status={membershipPayment.status}
        // The guide stays on this page — the panel behind has already refreshed
        // with the new membership state by the time the overlay closes.
        viewHref={null}
        viewLabel="View Membership"
        dashboardHref="/dashboard/guide"
        // Paying does not necessarily list them any more: an unverified guide's
        // 30 days start when an admin approves, not now. Promising visibility
        // here would be a lie for exactly the guides who most need the truth.
        successMessage={
          profile?.approvalStatus === "approved"
            ? "Your membership is confirmed — you're now visible to travellers."
            : "Payment received. Your 30-day subscription starts as soon as our team verifies your documents."
        }
        onRetry={handlePay}
        onDismiss={reset}
      />

      <div className="space-y-6">
        <GuidePageHeader
          title="Guide Membership"
          description="A 30-day membership keeps your profile listed and bookable on Get My Guide."
        />

        <GuidePanel>
          <div className="border-b border-slate-200 px-5 py-4">
            <GuideStatStrip>
              <GuideStat
                icon={Eye}
                label="Listing Status"
                value={isActive ? "Visible" : "Hidden"}
                accent={!!isActive}
              />
              <GuideStat
                icon={CalendarClock}
                label={
                  isActive
                    ? "Expires On"
                    : awaitingApproval
                      ? "Fee Paid On"
                      : "Expired On"
                }
                value={(awaitingApproval ? paidOn : expiryDate) ?? "—"}
              />
              <GuideStat
                icon={ShieldCheck}
                label="Profile"
                value={
                  profile?.registrationCompleted ? "Complete" : "Incomplete"
                }
              />
            </GuideStatStrip>
          </div>

          <div className="p-5">
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                isActive
                  ? "border-green-200 bg-green-50/60"
                  : awaitingApproval
                    ? "border-blue-200 bg-blue-50/60"
                    : "border-amber-200 bg-amber-50/60"
              }`}
            >
              {isActive ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : awaitingApproval ? (
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    isActive
                      ? "text-green-900"
                      : awaitingApproval
                        ? "text-blue-900"
                        : "text-amber-900"
                  }`}
                >
                  {isActive
                    ? "Membership active"
                    : awaitingApproval
                      ? "Payment received — awaiting verification"
                      : profile?.membershipStartDate
                        ? "Membership expired"
                        : "No active membership"}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    isActive
                      ? "text-green-800/80"
                      : awaitingApproval
                        ? "text-blue-800/80"
                        : "text-amber-800/80"
                  }`}
                >
                  {isActive
                    ? "Your profile is currently visible to travellers."
                    : awaitingApproval
                      ? "Your membership fee is paid. Our team is checking your documents — your 30 days start the moment you're approved, so nothing is lost while you wait. There is nothing more to pay."
                      : profile?.membershipStartDate
                        ? "Your listing is currently hidden from travellers."
                        : "Pay the membership fee to appear in public guide search."}
                </p>
              </div>
            </div>

            {profile?.membershipRefund?.status === "processed" && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-semibold">Membership fee refunded.</span>{" "}
                We refunded ₹
                {profile.membershipRefund.amount.toLocaleString("en-IN")} on{" "}
                {new Date(
                  profile.membershipRefund.refundedAt,
                ).toLocaleDateString("en-IN")}
                . It usually reaches your account within 5–7 working days.
              </div>
            )}

            <Button
              onClick={handlePay}
              // An awaiting-verification guide has already paid: taking their money
              // again is the one thing this page must never do.
              disabled={
                processing ||
                loading ||
                !profile?.registrationCompleted ||
                awaitingApproval
              }
              className="mt-5 w-full"
              size="lg"
            >
              {ctaLabel}
            </Button>

            {!profile?.registrationCompleted && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Complete your guide profile first to pay for membership.
              </p>
            )}
            {awaitingApproval && (
              <p className="mt-2 text-center text-xs text-slate-500">
                No further payment is needed. We&apos;ll email you when your
                profile is verified.
              </p>
            )}
          </div>
        </GuidePanel>

        <SubscriptionHistorySection
          reloadToken={historyReload}
          onRenew={handlePay}
          // Renewing is only meaningful for a registered guide who is not mid-payment
          // and is not already parked awaiting verification (they've paid already).
          canRenew={
            !!profile?.registrationCompleted && !awaitingApproval && !processing
          }
        />
      </div>
    </>
  );
}
