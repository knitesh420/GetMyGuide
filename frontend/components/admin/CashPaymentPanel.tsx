"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Ban, Coins, Lock, Pencil, Plus, X } from "lucide-react";
import { CashPayment } from "@/lib/data";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  CashPaymentInput,
  recordCashPayment,
  updateCashPayment,
  voidCashPayment,
} from "@/lib/redux/thunks/cashPayment/cashPaymentThunks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const shortDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

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

/** <input type="date"> wants yyyy-mm-dd, in local time. */
const toDateInput = (value: string | Date) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

type FormState = {
  amount: string;
  paymentDate: string;
  paidBy: "tourist" | "admin";
  touristName: string;
  bookingReference: string;
  remarks: string;
};

const emptyForm = (): FormState => ({
  amount: "",
  paymentDate: toDateInput(new Date()),
  paidBy: "tourist",
  touristName: "",
  bookingReference: "",
  remarks: "",
});

const formFrom = (payment: CashPayment): FormState => ({
  amount: String(payment.amount),
  paymentDate: toDateInput(payment.paymentDate),
  paidBy: payment.paidBy,
  touristName: payment.touristName ?? "",
  bookingReference: payment.bookingReference ?? "",
  remarks: payment.remarks ?? "",
});

/**
 * Cash a guide was handed — by a tourist at the end of a trip, or by the admin —
 * recorded after the fact.
 *
 * These records live in their own collection, entirely separate from the online
 * Razorpay payments above: neither can overwrite the other, and a guide's real
 * payment history is the union of the two.
 *
 * Nothing here moves money; it is book-keeping for money that already changed
 * hands. Deleting is a *void*, not a delete — the row survives, marked, so the
 * audit trail stays complete.
 */
export function CashPaymentPanel({
  guideAccountId,
  guideName,
}: {
  guideAccountId: string;
  guideName: string;
}) {
  const dispatch = useAppDispatch();
  const { payments, summary, loading, saving } = useAppSelector((state) => state.cashPayments);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (payment: CashPayment) => {
    setEditingId(payment._id);
    setForm(formFrom(payment));
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter the amount received.");
      return;
    }

    // Optional text fields are sent as undefined rather than "" so the backend
    // stores an absent value instead of an empty string.
    const payload: CashPaymentInput = {
      amount,
      paymentDate: form.paymentDate,
      paidBy: form.paidBy,
      touristName: form.touristName.trim() || undefined,
      bookingReference: form.bookingReference.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    };

    const result = editingId
      ? await dispatch(updateCashPayment({ paymentId: editingId, ...payload }))
      : await dispatch(recordCashPayment({ guideId: guideAccountId, ...payload }));

    const ok = editingId
      ? updateCashPayment.fulfilled.match(result)
      : recordCashPayment.fulfilled.match(result);

    if (ok) {
      toast.success(
        editingId
          ? "Payment updated."
          : `${rupees.format(amount)} recorded against ${guideName}.`,
      );
      close();
    } else {
      toast.error((result.payload as string) || "Could not save the payment.");
    }
  };

  const handleVoid = async (payment: CashPayment) => {
    const reason = window.prompt(
      `Void the ${rupees.format(payment.amount)} payment recorded on ${shortDate(payment.paymentDate)}?\n\nThe record is kept for the audit trail but stops counting, and disappears from the guide's payment history.\n\nReason (optional):`,
    );
    // `null` is Cancel. An empty string is "void it, no reason given".
    if (reason === null) return;

    const result = await dispatch(
      voidCashPayment({ paymentId: payment._id, reason: reason.trim() || undefined }),
    );

    if (voidCashPayment.fulfilled.match(result)) {
      toast.success("Payment voided.");
    } else {
      toast.error((result.payload as string) || "Could not void the payment.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            Cash payments
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.count === 0
              ? "No cash payments recorded."
              : `${summary.count} payment${summary.count === 1 ? "" : "s"} · ${rupees.format(summary.totalAmount)} total`}
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Record cash payment
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit cash payment" : "Record a cash payment"}
              </h3>
              <button
                type="button"
                onClick={close}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Amount (₹) *</span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="2500"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Payment date *</span>
                <Input
                  type="date"
                  required
                  // Cash is recorded after the fact, so a future date is a typo.
                  max={toDateInput(new Date())}
                  value={form.paymentDate}
                  onChange={(e) => set("paymentDate", e.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Paid by *</span>
                <select
                  value={form.paidBy}
                  onChange={(e) => set("paidBy", e.target.value as "tourist" | "admin")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="tourist">Tourist</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Tourist name</span>
                <Input
                  value={form.touristName}
                  onChange={(e) => set("touristName", e.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Booking reference</span>
                <Input
                  value={form.bookingReference}
                  onChange={(e) => set("bookingReference", e.target.value)}
                  placeholder="Optional — e.g. BK000123"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Payment method</span>
                {/* Cash is the only method that can be recorded by hand — an online
                    payment already exists as a Razorpay transaction. Shown, not
                    editable, so the record is unambiguous. */}
                <Input value="Cash" readOnly disabled />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Remarks</span>
              <textarea
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Optional — what this payment was for"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Record payment"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <p className="ml-auto text-xs text-muted-foreground">
                Recorded against your admin account.
              </p>
            </div>
          </form>
        )}

        {loading && payments.length === 0 ? (
          <Skeleton className="h-32" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet. Use “Record cash payment” when {guideName} is paid in cash.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Ref</th>
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Paid by</th>
                  <th className="pb-2 pr-4 font-medium">Tourist / booking</th>
                  <th className="pb-2 pr-4 font-medium">Remarks</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Audit</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const voided = p.status === "voided";
                  return (
                    <tr
                      key={p._id}
                      className={`border-b last:border-0 ${voided ? "text-muted-foreground" : ""}`}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{p.cashPaymentCode ?? "—"}</td>
                      <td className="py-2 pr-4">{shortDate(p.paymentDate)}</td>
                      <td className={`py-2 pr-4 font-medium ${voided ? "line-through" : ""}`}>
                        {rupees.format(p.amount)}
                      </td>
                      <td className="py-2 pr-4 capitalize">{p.paidBy}</td>
                      <td className="py-2 pr-4">
                        {p.touristName || p.bookingReference ? (
                          <span>
                            {p.touristName}
                            {p.touristName && p.bookingReference ? " · " : ""}
                            {p.bookingReference}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[220px] truncate py-2 pr-4" title={p.remarks}>
                        {p.remarks || "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {voided ? (
                          <Badge variant="destructive">Voided</Badge>
                        ) : (
                          <Badge variant="success">Received</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        <div>Recorded by {p.recordedBy?.name ?? "—"}</div>
                        <div>{dateTime(p.createdAt)}</div>
                        {p.updatedBy && <div>Edited by {p.updatedBy.name}</div>}
                        {voided && (
                          <div>
                            Voided by {p.deletedBy?.name ?? "—"} · {shortDate(p.deletedAt)}
                            {p.voidReason ? ` · ${p.voidReason}` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {voided ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(p)}
                              disabled={saving}
                              aria-label="Edit payment"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleVoid(p)}
                              disabled={saving}
                              aria-label="Void payment"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          Only admins can record, edit or void these. Voided records are kept for the audit trail and
          hidden from the guide.
        </p>
      </CardContent>
    </Card>
  );
}

export default CashPaymentPanel;
