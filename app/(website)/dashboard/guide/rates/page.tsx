"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Banknote, CheckCircle2, IndianRupee, Landmark } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  getMyGuideProfile,
  updateMyBankDetails,
  updateMyPricing,
} from "@/lib/redux/thunks/guide/guideThunk";
import { GuidePageHeader, GuidePanel, GuideSection } from "@/components/guide";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

/**
 * Two things the guide owns that the rest of the platform depends on:
 *
 *  - Rates. Direct bookings (a tourist picking this guide off their profile) are
 *    priced from the full-day rate server-side. Without it the guide simply is
 *    not bookable directly, which is why the page says so rather than hiding it.
 *  - Bank details. Payouts are sent by hand, so this is where the money goes.
 */
export default function GuideRatesPage() {
  const dispatch = useAppDispatch();
  const { myProfile: profile, loading } = useAppSelector((state) => state.guide);

  const [halfDay, setHalfDay] = useState("");
  const [fullDay, setFullDay] = useState("");
  const [savingRates, setSavingRates] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    dispatch(getMyGuideProfile());
  }, [dispatch]);

  // Seed the form from the profile once it arrives. Guarded on the value being
  // present so a re-fetch never stomps on what the guide is halfway through typing.
  useEffect(() => {
    const pricing = (profile as any)?.pricing;
    if (pricing) {
      setHalfDay((prev) => prev || String(pricing.halfDay ?? ""));
      setFullDay((prev) => prev || String(pricing.fullDay ?? ""));
    }

    const bank = (profile as any)?.bankDetails;
    if (bank) {
      setAccountHolderName((prev) => prev || (bank.accountHolderName ?? ""));
      setAccountNumber((prev) => prev || (bank.accountNumber ?? ""));
      setIfsc((prev) => prev || (bank.ifsc ?? ""));
      setUpiId((prev) => prev || (bank.upiId ?? ""));
    }
  }, [profile]);

  const handleSaveRates = async () => {
    const full = Number(fullDay);
    if (!full || full <= 0) {
      toast.error("Enter your full-day rate — it is what direct bookings are priced from.");
      return;
    }

    setSavingRates(true);
    const result = await dispatch(
      updateMyPricing({ halfDay: Number(halfDay) || 0, fullDay: full }),
    );
    setSavingRates(false);

    if (updateMyPricing.fulfilled.match(result)) {
      toast.success("Your rates have been published.");
      dispatch(getMyGuideProfile());
    } else {
      toast.error((result.payload as string) || "Could not save your rates.");
    }
  };

  const handleSaveBank = async () => {
    const hasBank = accountNumber.trim() && ifsc.trim();
    if (!hasBank && !upiId.trim()) {
      toast.error("Give us either an account number with IFSC, or a UPI ID.");
      return;
    }

    setSavingBank(true);
    const result = await dispatch(
      updateMyBankDetails({
        accountHolderName: accountHolderName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        ifsc: ifsc.trim() || undefined,
        upiId: upiId.trim() || undefined,
      }),
    );
    setSavingBank(false);

    if (updateMyBankDetails.fulfilled.match(result)) {
      toast.success("Payout details saved.");
      dispatch(getMyGuideProfile());
    } else {
      toast.error((result.payload as string) || "Could not save your payout details.");
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasRates = Number((profile as any)?.pricing?.fullDay ?? 0) > 0;
  const approvalStatus = (profile as any)?.approvalStatus ?? "pending";

  return (
    <div className="space-y-6">
      <GuidePageHeader
        title="Rates & Payouts"
        description="What you charge, and where we send your money."
      />

      {approvalStatus === "rejected" && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Your profile was not verified.</p>
            <p>{(profile as any)?.rejectionReason || "Please contact support."}</p>
          </div>
        </div>
      )}

      {approvalStatus === "pending" && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your documents are still being verified. You can set your rates now — you will become
            bookable as soon as an admin approves you.
          </p>
        </div>
      )}

      <GuidePanel>
        <GuideSection
          title="Your rates"
          icon={IndianRupee}
          description="Tourists who book you directly are charged your full-day rate for each day of the trip. They pay 20% up front and the balance before the tour."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Half-day rate (₹)</span>
              <input
                type="number"
                min={0}
                value={halfDay}
                onChange={(e) => setHalfDay(e.target.value)}
                placeholder="e.g. 1500"
                className={inputClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">
                Full-day rate (₹) <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                min={1}
                value={fullDay}
                onChange={(e) => setFullDay(e.target.value)}
                placeholder="e.g. 2500"
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSaveRates} disabled={savingRates}>
              {savingRates ? "Saving…" : "Save rates"}
            </Button>
            {hasRates && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Published — you can be booked directly
              </span>
            )}
          </div>
        </GuideSection>

        <GuideSection
          title="Payout details"
          icon={Landmark}
          description="Where we send your earnings. Give us a bank account or a UPI ID — either is enough."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-slate-500">Account holder name</span>
              <input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="As it appears on your bank account"
                className={inputClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">Account number</span>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                inputMode="numeric"
                className={inputClass}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500">IFSC</span>
              <input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className={`${inputClass} uppercase`}
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-slate-500">
                UPI ID <span className="font-normal">(instead of a bank account)</span>
              </span>
              <input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@bank"
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSaveBank} disabled={savingBank}>
              <Banknote className="mr-1.5 h-4 w-4" />
              {savingBank ? "Saving…" : "Save payout details"}
            </Button>
          </div>
        </GuideSection>
      </GuidePanel>
    </div>
  );
}
