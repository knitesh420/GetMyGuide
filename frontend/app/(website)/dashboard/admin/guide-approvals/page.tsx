"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { BadgeCheck, ExternalLink, ShieldQuestion } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  PendingApproval,
  approveGuide,
  fetchPendingApprovals,
  rejectGuide,
} from "@/lib/redux/thunks/guide/guideThunk";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const shortDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/** Uploads land in this order — see Guide.identityProofs in the backend schema. */
const PROOF_LABELS = ["Licence", "Aadhaar"];

/**
 * The KYC inbox. A guide who has submitted documents is not bookable until an
 * admin looks at them here — paying for membership alone is no longer enough.
 *
 * Approving a guide who has already paid lists them immediately; approving one
 * who has not simply clears them to pay.
 */
export default function AdminGuideApprovalsPage() {
  const dispatch = useAppDispatch();

  const [guides, setGuides] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await dispatch(fetchPendingApprovals());
    if (fetchPendingApprovals.fulfilled.match(result)) {
      setGuides(result.payload);
    } else {
      toast.error((result.payload as string) || "Could not load the review queue.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleApprove = async (guide: PendingApproval) => {
    setBusyId(guide.accountId);
    const result = await dispatch(approveGuide(guide.accountId));
    setBusyId(null);

    if (approveGuide.fulfilled.match(result)) {
      toast.success(`${guide.name} approved.`);
      setGuides((prev) => prev.filter((g) => g.accountId !== guide.accountId));
    } else {
      toast.error((result.payload as string) || "Could not approve this guide.");
    }
  };

  const handleReject = async (guide: PendingApproval) => {
    if (reason.trim().length < 10) {
      toast.error("Tell the guide what was wrong — they are shown this verbatim.");
      return;
    }

    setBusyId(guide.accountId);
    const result = await dispatch(
      rejectGuide({ guideAccountId: guide.accountId, reason: reason.trim() }),
    );
    setBusyId(null);

    if (rejectGuide.fulfilled.match(result)) {
      toast.success(`${guide.name} rejected.`);
      setGuides((prev) => prev.filter((g) => g.accountId !== guide.accountId));
      setRejectingId(null);
      setReason("");
    } else {
      toast.error((result.payload as string) || "Could not reject this guide.");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Guide Verification</h1>
        <p className="text-muted-foreground">
          Check each guide&apos;s documents before they can take bookings.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border bg-white px-6 py-16 text-center">
          <BadgeCheck className="h-10 w-10 text-green-500" />
          <p className="mt-4 font-semibold text-slate-900">Nothing to review</p>
          <p className="mt-1 text-sm text-slate-500">
            Every guide who has submitted documents has been dealt with.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <article key={guide.accountId} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {guide.profileImage ? (
                    <Image
                      src={guide.profileImage}
                      alt={`${guide.name}'s profile photo`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <ShieldQuestion className="absolute inset-0 m-auto h-8 w-8 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{guide.name}</h2>
                    <span className="text-xs text-slate-400">{guide.guideCode}</span>
                    {guide.type === "escort" && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                        Certified / escort
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500">
                    {guide.email} · {guide.phone}
                  </p>

                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-400">City</dt>
                      <dd className="font-medium text-slate-800">{guide.city || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Languages</dt>
                      <dd className="font-medium text-slate-800">
                        {guide.languages.length ? guide.languages.join(", ") : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">PAN</dt>
                      <dd className="font-mono font-medium text-slate-800">{guide.pan || "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-400">Documents</p>
                    {guide.identityProofs.length === 0 ? (
                      <p className="mt-1 text-sm text-amber-700">No documents uploaded.</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {guide.identityProofs.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-teal-700 transition-colors hover:bg-teal-50"
                          >
                            {PROOF_LABELS[index] ?? `Document ${index + 1}`}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Submitted {shortDate(guide.submittedAt)}
                  </p>
                </div>
              </div>

              {rejectingId === guide.accountId ? (
                <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-500">
                      Why is this being rejected? The guide is shown this verbatim.
                    </span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="e.g. The licence photo is unreadable — please re-upload a clear scan."
                      className="w-full rounded-md border px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === guide.accountId}
                      onClick={() => handleReject(guide)}
                    >
                      Confirm rejection
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRejectingId(null);
                        setReason("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === guide.accountId}
                    onClick={() => handleApprove(guide)}
                  >
                    <BadgeCheck className="mr-1.5 h-4 w-4" />
                    {busyId === guide.accountId ? "Approving…" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === guide.accountId}
                    onClick={() => setRejectingId(guide.accountId)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
