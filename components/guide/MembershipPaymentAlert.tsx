"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { apiService } from "@/lib/service/api";
import type { FailedPaymentEntry } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { GuidePanel } from "./guide-shell";

/**
 * "Your membership payment was declined", on the guide's dashboard home.
 *
 * A declined fee leaves the guide unlisted, and the only banner for that said
 * "Membership expired" — which is wrong twice over: it blames the calendar, and
 * for a guide who never had a membership nothing had expired at all. Neither
 * version told them the bank had refused the card, so nobody knew to retry.
 *
 * Fetched here rather than folded into the profile payload: this is the one
 * screen that needs it, and the profile endpoint is on the critical path for
 * every guide page.
 */
export function MembershipPaymentAlert() {
  const [attempt, setAttempt] = useState<FailedPaymentEntry | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiService
      .get<FailedPaymentEntry[]>("/payment/my-failed")
      .then((response) => {
        if (cancelled) return;
        const membership = (response.data ?? []).find(
          (row) => row.referenceType === "guide_membership",
        );
        setAttempt(membership ?? null);
      })
      // A banner is not worth an error state — if this read fails the rest of
      // the dashboard is unaffected and the guide simply sees one less notice.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!attempt) return null;

  const pendingCheck = attempt.status === "pending_verification";

  return (
    <GuidePanel className="border-red-200 bg-red-50/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <XCircle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
          />
          <div>
            <p className="font-semibold text-red-900">
              {pendingCheck
                ? "We're still confirming your membership payment"
                : "Your membership payment was declined"}
            </p>
            <p className="mt-1 text-sm text-red-800/80">
              {pendingCheck
                ? "The money left your account but we haven't finished processing it. Our team is looking into it — no action needed."
                : (attempt.failure?.description ??
                  attempt.failure?.reason ??
                  "The payment did not complete, so your membership hasn't started.")}
            </p>
          </div>
        </div>

        {!pendingCheck && (
          <Button
            asChild
            className="shrink-0 bg-red-600 text-white hover:bg-red-700"
          >
            <Link href="/dashboard/guide/buy-subscription">Try again</Link>
          </Button>
        )}
      </div>
    </GuidePanel>
  );
}

export default MembershipPaymentAlert;
