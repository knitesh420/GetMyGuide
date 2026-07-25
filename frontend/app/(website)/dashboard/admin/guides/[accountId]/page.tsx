"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/swal";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminPanel,
  AdminSection,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
} from "@/components/admin/ui";
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
    const confirmed = await confirmDialog({
      title: `Reactivate ${detail?.name}?`,
      text: "They will regain access and be listed on the site again.",
      confirmText: "Reactivate",
      icon: "question",
    });
    if (!confirmed) return;

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
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <p className="text-sm text-slate-500">This guide could not be loaded.</p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/dashboard/admin/guides")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to guides
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <Link
          href="/dashboard/admin/guides"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All guides
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {detail.name}
          </h1>
          <span className="font-mono text-sm text-slate-500">
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
        <p className="mt-1 text-sm text-slate-500">
          {detail.email} · {detail.phone ?? "—"} · {detail.city || "No city"}
        </p>
      </div>

      {/* ---- Profile & membership ------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel>
          <AdminSection title="Membership">
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={membershipState?.tone ?? "outline"}>{membershipState?.label}</Badge>
                <span className="text-slate-500">{membershipState?.detail}</span>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs text-slate-400">Fee paid on</dt>
                  <dd className="font-medium text-slate-800">{dateTime(detail.membershipPaidAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Subscription started</dt>
                  <dd className="font-medium text-slate-800">{dateTime(detail.membershipStartDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Expires</dt>
                  <dd className="font-medium text-slate-800">{dateTime(detail.membershipExpiryDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Approved</dt>
                  <dd className="font-medium text-slate-800">{dateTime(detail.approvedAt)}</dd>
                </div>
              </dl>

              {detail.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-medium">Rejected</p>
                  <p className="mt-0.5">{detail.rejectionReason}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400">Published rates</p>
                <p className="font-medium text-slate-800">
                  {detail.pricing?.fullDay
                    ? `${rupees.format(detail.pricing.fullDay)} full day${
                        detail.pricing.halfDay
                          ? ` · ${rupees.format(detail.pricing.halfDay)} half day`
                          : ""
                      }`
                    : "No rates published"}
                </p>
              </div>
            </div>
          </AdminSection>
        </AdminPanel>

        {/* ---- KYC documents ------------------------------------------ */}
        <AdminPanel>
          <AdminSection title="Identity documents" icon={FileText}>
            <div className="space-y-3">
              <GuideDocumentLinks documents={detail.documents} />
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                Only admins can open these.
              </p>
              {detail.pan && (
                <div>
                  <p className="text-xs text-slate-400">PAN</p>
                  <p className="font-mono text-sm font-medium text-slate-800">{detail.pan}</p>
                </div>
              )}
            </div>
          </AdminSection>
        </AdminPanel>
      </div>

      {/* ---- Admin notes --------------------------------------------- */}
      <AdminPanel>
        <AdminSection title="Internal notes" icon={NotebookPen}>
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Anything the team should know about this guide — verification history, complaints, agreements made over the phone…"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
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
          </div>
        </AdminSection>
      </AdminPanel>

      {/* ---- Payment information (ADMIN ONLY) ------------------------ */}
      <AdminPanel>
        <AdminSection title="Payment information" icon={CreditCard}>
          <div className="space-y-6">
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3 w-3" />
              Payment identifiers and bank details are never shown to tourists or on any public page.
            </p>

            {/* Bank / payout destination */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Banknote className="h-4 w-4 text-slate-400" />
                Payout destination
              </h3>
              {detail.bankDetails ? (
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-400">Account holder</dt>
                    <dd className="font-medium text-slate-800">{detail.bankDetails.accountHolderName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Account number</dt>
                    <dd className="font-mono font-medium text-slate-800">{detail.bankDetails.accountNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">IFSC</dt>
                    <dd className="font-mono font-medium text-slate-800">{detail.bankDetails.ifsc ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">UPI ID</dt>
                    <dd className="font-medium text-slate-800">{detail.bankDetails.upiId ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">
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
                    <dt className="text-xs text-slate-400">Amount</dt>
                    <dd className="font-medium text-slate-800">{rupees.format(detail.membershipRefund.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Refund ID</dt>
                    <dd className="font-mono text-xs font-medium text-slate-800">
                      {detail.membershipRefund.refundId ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Date &amp; time</dt>
                    <dd className="font-medium text-slate-800">{dateTime(detail.membershipRefund.refundedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Payment refunded</dt>
                    <dd className="font-mono text-xs font-medium text-slate-800">
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
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Online payments (Razorpay)</h3>
              {detail.transactions.length === 0 ? (
                <p className="text-sm text-slate-500">No membership payments on record.</p>
              ) : (
                <div className="-mx-6 border-t border-slate-200">
                  <AdminTable>
                    <AdminTableHead
                      columns={[
                        "Payment ID",
                        "Razorpay payment",
                        "Order",
                        "Amount",
                        "Status",
                        "Date",
                      ]}
                    />
                    <tbody>
                      {detail.transactions.map((t, i) => (
                        <AdminTableRow key={t._id} index={i}>
                          <AdminTableCell className="font-mono text-xs">
                            {t.paymentCode ?? "—"}
                          </AdminTableCell>
                          <AdminTableCell className="font-mono text-xs">
                            {t.razorpay_payment_id ?? "—"}
                          </AdminTableCell>
                          <AdminTableCell className="font-mono text-xs">
                            {t.razorpay_order_id}
                          </AdminTableCell>
                          <AdminTableCell className="font-medium text-slate-900">
                            {rupees.format(t.amount)}
                          </AdminTableCell>
                          <AdminTableCell>
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
                          </AdminTableCell>
                          <AdminTableCell last className="text-slate-500">
                            {shortDate(t.createdAt)}
                          </AdminTableCell>
                        </AdminTableRow>
                      ))}
                    </tbody>
                  </AdminTable>
                </div>
              )}
            </div>
          </div>
        </AdminSection>
      </AdminPanel>

      {/* ---- Manual cash payments ------------------------------------ */}
      <CashPaymentPanel guideAccountId={accountId} guideName={detail.name} />
    </div>
  );
}
