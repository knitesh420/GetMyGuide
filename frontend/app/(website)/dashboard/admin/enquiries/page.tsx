"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MessageSquare, Mail, Phone, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  Lead,
  deleteLead,
  fetchLeads,
  updateLeadStatus,
} from "@/lib/redux/contactSlice";
import { PageHeader, EmptyState, AdminStatusBadge } from "@/components/admin/ui";
import { SkeletonList } from "@/components/animations/Skeletons";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUSES = ["pending", "reviewed", "resolved"] as const;

const STATUS_TONE: Record<string, "warning" | "info" | "success"> = {
  pending: "warning",
  reviewed: "info",
  resolved: "success",
};

const TABS: { label: string; status?: string }[] = [
  { label: "Pending", status: "pending" },
  { label: "Reviewed", status: "reviewed" },
  { label: "Resolved", status: "resolved" },
  { label: "All" },
];

const longDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function EnquiryCard({ lead }: { lead: Lead }) {
  const dispatch = useAppDispatch();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleStatus = async (status: string) => {
    const result = await dispatch(updateLeadStatus({ id: lead._id, status }));
    if (updateLeadStatus.fulfilled.match(result)) {
      toast.success(`Marked as ${status}.`);
    } else {
      toast.error((result.payload as string) || "Could not update the status.");
    }
  };

  const handleDelete = async () => {
    const result = await dispatch(deleteLead(lead._id));
    setConfirmingDelete(false);
    if (deleteLead.fulfilled.match(result)) {
      toast.success("Enquiry deleted.");
    } else {
      toast.error((result.payload as string) || "Could not delete the enquiry.");
    }
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{lead.fullName}</h2>
            <AdminStatusBadge
              status={lead.status}
              tone={STATUS_TONE[lead.status] ?? "warning"}
            />
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600 ring-1 ring-inset ring-slate-500/20">
              {lead.category}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-1.5 hover:text-teal-600"
            >
              <Mail className="h-3.5 w-3.5" />
              {lead.email}
            </a>
            <a
              href={`tel:${lead.phoneNumber}`}
              className="flex items-center gap-1.5 hover:text-teal-600"
            >
              <Phone className="h-3.5 w-3.5" />
              {lead.phoneNumber}
            </a>
            {lead.nationality && <span>{lead.nationality}</span>}
          </div>
        </div>

        <span className="whitespace-nowrap text-xs text-slate-400">
          {longDate(lead.createdAt)}
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
        {lead.subject && (
          <p className="text-sm font-medium text-slate-800">{lead.subject}</p>
        )}
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
          {lead.message}
        </p>
        {lead.serviceName && (
          <p className="mt-1.5 text-xs text-slate-500">
            Enquiring about: <span className="font-medium">{lead.serviceName}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUSES.filter((s) => s !== lead.status).map((status) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="capitalize"
            onClick={() => handleStatus(status)}
          >
            Mark {status}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {lead.fullName}&rsquo;s message will be removed permanently. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export default function AdminEnquiriesPage() {
  const dispatch = useAppDispatch();
  const { leads, loading, error } = useAppSelector((state) => state.contacts);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    dispatch(fetchLeads());
  }, [dispatch]);

  // The endpoint has no status filter, so the tabs narrow the list client-side.
  // At the volume a contact form produces that is cheaper than a round trip.
  const visible = useMemo(() => {
    const status = TABS[tab].status;
    return status ? leads.filter((lead) => lead.status === status) : leads;
  }, [leads, tab]);

  const pendingCount = useMemo(
    () => leads.filter((lead) => lead.status === "pending").length,
    [leads],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description={
          pendingCount > 0
            ? `${pendingCount} enquir${pendingCount === 1 ? "y" : "ies"} waiting on a reply.`
            : "Messages sent through the contact form."
        }
      >
        <Button
          variant="outline"
          onClick={() => dispatch(fetchLeads())}
          disabled={loading}
        >
          Refresh
        </Button>
      </PageHeader>

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

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && leads.length === 0 ? (
        <SkeletonList rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No enquiries here"
          description="Messages submitted through the contact form will appear on this page."
        />
      ) : (
        <div className="space-y-4">
          {visible.map((lead) => (
            <EnquiryCard key={lead._id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
