"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  FileText,
  Lock,
  NotebookPen,
  Undo2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { clearAdminGuideDetail } from "@/lib/redux/adminGuidesSlice";
import {
  fetchAdminGuideDetail,
  saveGuideNotes,
} from "@/lib/redux/thunks/guide/adminGuideThunks";
import { reactivateGuide } from "@/lib/redux/thunks/guide/guideThunk";
import { clearCashPayments } from "@/lib/redux/cashPaymentSlice";
import { fetchGuideCashPayments } from "@/lib/redux/thunks/cashPayment/cashPaymentThunks";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GuideDocumentLinks } from "@/components/admin/GuideDocumentLinks";
import { CashPaymentPanel } from "@/components/admin/CashPaymentPanel";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const shortDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const APPROVAL_BADGE: Record<string, "success" | "pending" | "destructive"> = {
  approved: "success",
  pending: "pending",
  rejected: "destructive",
};

/**
 * One guide, in full, for an admin.
 *
 * This is the only screen in the product that shows a guide's Razorpay payment
 * identifiers, their bank account, and the internal notes kept about them. All
 * three come from GET /guide/admin/:id, which is behind an admin-only guard —
 * none of it appears on any public or guide-facing endpoint.
 */
export default function AdminGuideDetailPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { detail, detailLoading, savingNotes } = useAppSelector((state) => state.adminGuides);

  const [notes, setNotes] = useState("");
  /** Notes as they are on the server, so we know whether the box is dirty. */
  const [savedNotes, setSavedNotes] = useState("");
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !accountId) return;

    dispatch(fetchAdminGuideDetail(accountId));
    dispatch(fetchGuideCashPayments({ guideAccountId: accountId }));

    // Leaving must not leave the previous guide's records on screen behind the
    // next one's loading state.
    return () => {
      dispatch(clearAdminGuideDetail());
      dispatch(clearCashPayments());
    };
  }, [dispatch, isAuthenticated, accountId]);

  // Seed the textarea once the notes arrive, without clobbering an edit in
  // progress on a refetch.
  useEffect(() => {
    if (detail && detail.adminNotes !== savedNotes) {
      setSavedNotes(detail.adminNotes);
      setNotes(detail.adminNotes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.accountId, detail?.adminNotesUpdatedAt]);

  const notesDirty = notes !== savedNotes;

  const handleSaveNotes = async () => {
    const result = await dispatch(saveGuideNotes({ accountId, notes: notes.trim() }));

    if (saveGuideNotes.fulfilled.match(result)) {
      setSavedNotes(result.payload.adminNotes);
      setNotes(result.payload.adminNotes);
      toast.success("Notes saved.");
    } else {
      toast.error((result.payload as string) || "Could not save the notes.");
    }
  };

  // Reverse a suspension from the guide's own page. The "Suspended" badge shows
  // here but the action to undo it lived only on the list — so an admin who
  // drilled in had to go back out to reinstate the guide.
  const handleReactivate = async () => {
    if (
      !window.confirm(
        `Reactivate ${detail?.name}? They will regain access and be listed on the site again.`,
      )
    ) {
      return;
    }

    setReactivating(true);
    const result = await dispatch(reactivateGuide(accountId));
    setReactivating(false);

    if (reactivateGuide.fulfilled.match(result)) {
      toast.success(`${detail?.name} reactivated.`);
    } else {
      toast.error((result.payload as string) || "Could not reactivate the guide.");
    }
  };

  const membershipState = useMemo(() => {
    if (!detail) return null;
    if (detail.membershipActive) {
      return {
        label: "Active",
        tone: "success" as const,
        detail: `Runs until ${shortDate(detail.membershipExpiryDate)}`,
      };
    }
    if (detail.membershipPendingActivation) {
      return {
        label: "Paid — starts on approval",
        tone: "pending" as const,
        detail: `Fee paid ${shortDate(detail.membershipPaidAt)}. The 30-day subscription begins the moment you approve this guide.`,
      };
    }
    if (detail.membershipStartDate) {
      return {
        label: "Lapsed",
        tone: "destructive" as const,
        detail: `Expired ${shortDate(detail.membershipExpiryDate)}`,
      };
    }
    return { label: "Never subscribed", tone: "outline" as const, detail: "No membership fee paid." };
  }, [detail]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  if (detailLoading && !detail) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <p className="text-sm text-muted-foreground">This guide could not be loaded.</p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/dashboard/admin/guides")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to guides
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 bg-muted/40 p-4 sm:p-6 md:p-8">
      <div>
        <Link
          href="/dashboard/admin/guides"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All guides
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">{detail.name}</h2>
          <span className="font-mono text-sm text-muted-foreground">
            {detail.guideCode ?? "—"}
          </span>
          <Badge variant={APPROVAL_BADGE[detail.approvalStatus] ?? "outline"}>
            {detail.approvalStatus}
          </Badge>
          {!detail.isActive && (
            <>
              <Badge variant="destructive">Suspended</Badge>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={handleReactivate}
                disabled={reactivating}
              >
                <Undo2 className="mr-1.5 h-4 w-4" />
                {reactivating ? "Reactivating…" : "Reactivate"}
              </Button>
            </>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.email} · {detail.phone ?? "—"} · {detail.city || "No city"}
        </p>
      </div>

      {/* ---- Profile & membership ------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={membershipState?.tone ?? "outline"}>{membershipState?.label}</Badge>
              <span className="text-muted-foreground">{membershipState?.detail}</span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Fee paid on</dt>
                <dd className="font-medium">{dateTime(detail.membershipPaidAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Subscription started</dt>
                <dd className="font-medium">{dateTime(detail.membershipStartDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Expires</dt>
                <dd className="font-medium">{dateTime(detail.membershipExpiryDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Approved</dt>
                <dd className="font-medium">{dateTime(detail.approvedAt)}</dd>
              </div>
            </dl>

            {detail.rejectionReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="font-medium">Rejected</p>
                <p className="mt-0.5">{detail.rejectionReason}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground">Published rates</p>
              <p className="font-medium">
                {detail.pricing?.fullDay
                  ? `${rupees.format(detail.pricing.fullDay)} full day${
                      detail.pricing.halfDay
                        ? ` · ${rupees.format(detail.pricing.halfDay)} half day`
                        : ""
                    }`
                  : "No rates published"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ---- KYC documents ------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Identity documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GuideDocumentLinks documents={detail.documents} />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Only admins can open these.
            </p>
            {detail.pan && (
              <div>
                <p className="text-xs text-muted-foreground">PAN</p>
                <p className="font-mono text-sm font-medium">{detail.pan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Admin notes --------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4" />
            Internal notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Anything the team should know about this guide — verification history, complaints, agreements made over the phone…"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Visible to admins only. The guide never sees this.
              {detail.adminNotesUpdatedAt && (
                <span className="ml-1">
                  · Last edited {dateTime(detail.adminNotesUpdatedAt)}
                  {detail.adminNotesUpdatedBy ? ` by ${detail.adminNotesUpdatedBy}` : ""}
                </span>
              )}
            </p>
            <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes || !notesDirty}>
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Payment information (ADMIN ONLY) ------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Payment identifiers and bank details are never shown to tourists or on any public page.
          </p>

          {/* Bank / payout destination */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Payout destination
            </h3>
            {detail.bankDetails ? (
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Account holder</dt>
                  <dd className="font-medium">{detail.bankDetails.accountHolderName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account number</dt>
                  <dd className="font-mono font-medium">{detail.bankDetails.accountNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">IFSC</dt>
                  <dd className="font-mono font-medium">{detail.bankDetails.ifsc ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">UPI ID</dt>
                  <dd className="font-medium">{detail.bankDetails.upiId ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                The guide has not set a payout destination yet.
              </p>
            )}
          </div>

          {/* Auto-refund on rejection */}
          {detail.membershipRefund && (
            <div
              className={`rounded-lg border p-4 ${
                detail.membershipRefund.status === "processed"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Undo2 className="h-4 w-4" />
                Membership refund —{" "}
                {detail.membershipRefund.status === "processed" ? "processed" : "FAILED"}
              </h3>
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Amount</dt>
                  <dd className="font-medium">{rupees.format(detail.membershipRefund.amount)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Refund ID</dt>
                  <dd className="font-mono text-xs font-medium">
                    {detail.membershipRefund.refundId ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Date &amp; time</dt>
                  <dd className="font-medium">{dateTime(detail.membershipRefund.refundedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Payment refunded</dt>
                  <dd className="font-mono text-xs font-medium">
                    {detail.membershipRefund.razorpay_payment_id ?? "—"}
                  </dd>
                </div>
              </dl>
              {detail.membershipRefund.failureReason && (
                <p className="mt-2 text-sm text-red-800">
                  <span className="font-medium">Reason:</span>{" "}
                  {detail.membershipRefund.failureReason} — the money has NOT gone back. Refund it
                  from the Razorpay dashboard.
                </p>
              )}
            </div>
          )}

          {/* Online (Razorpay) membership payments */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Online payments (Razorpay)</h3>
            {detail.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No membership payments on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Payment ID</th>
                      <th className="pb-2 pr-4 font-medium">Razorpay payment</th>
                      <th className="pb-2 pr-4 font-medium">Order</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.transactions.map((t) => (
                      <tr key={t._id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{t.paymentCode ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          {t.razorpay_payment_id ?? "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs">{t.razorpay_order_id}</td>
                        <td className="py-2 pr-4 font-medium">{rupees.format(t.amount)}</td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant={
                              t.status === "refunded"
                                ? "pending"
                                : t.status === "failed"
                                  ? "destructive"
                                  : "success"
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{shortDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Manual cash payments ------------------------------------ */}
      <CashPaymentPanel guideAccountId={accountId} guideName={detail.name} />
    </div>
  );
}
