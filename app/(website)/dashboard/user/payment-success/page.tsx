// app/payment-success/page.tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/components/dashboard/tourist/format";
import { CARD, PAGE_TITLE } from "@/components/dashboard/tourist/ui";

function SuccessMessage() {
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-inset ring-green-500/20"
      >
        <CheckCircle className="h-10 w-10 text-green-600" />
      </span>

      <div className="space-y-3">
        <h1 className={PAGE_TITLE}>Payment Successful!</h1>

        {amount && (
          <p className="text-sm text-slate-500 md:text-base">
            You have successfully paid{" "}
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(Number(amount))}
            </span>
            .
          </p>
        )}

        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-700 md:text-base">
          Your booking status has been updated. A confirmation has been sent to
          your email.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        <Button asChild className="red-gradient h-10 rounded-lg px-5">
          <Link href="/tours">
            Explore More
            <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-lg border-slate-200 px-5 text-slate-700 hover:bg-teal-500/10 hover:text-teal-700"
        >
          <Link href="/dashboard/user">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

/** Same shape as SuccessMessage, so the card doesn't resize when params read. */
function SuccessSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col items-center gap-6"
    >
      <span className="sr-only">Confirming your payment…</span>
      <Skeleton className="h-20 w-20 rounded-xl" />
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl justify-center py-8 lg:py-10">
      <Card className={`${CARD} w-full p-6 lg:p-8`}>
        <Suspense fallback={<SuccessSkeleton />}>
          <SuccessMessage />
        </Suspense>
      </Card>
    </div>
  );
}
