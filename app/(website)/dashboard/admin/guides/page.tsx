"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { AppDispatch, RootState } from "@/lib/store";
import { fetchAdminGuides } from "@/lib/redux/thunks/guide/adminGuideThunks";
import { deleteGuide, reactivateGuide } from "@/lib/redux/thunks/guide/guideThunk";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/utils/toastHelper";
import { confirmDialog } from "@/lib/swal";
import {
  AdminCellStack,
  AdminPanel,
  AdminSearchInput,
  AdminStatusBadge,
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableRow,
  AdminToolbar,
  EmptyState,
  PageHeader,
} from "@/components/admin/ui";
import { SkeletonTable } from "@/components/animations/Skeletons";
import { useAuth } from "@/lib/hooks/useAuth";

export default function AdminGuidesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guides, loading } = useSelector((state: RootState) => state.adminGuides);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAdminGuides());
  }, [dispatch, isAuthenticated]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter((g) =>
      [g.name, g.email, g.guideCode ?? "", g.city, g.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [guides, search]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  // Suspension hides the guide from the site and blocks their login. It is
  // reversible via handleReactivate below, so this asks before doing it.
  const handleSuspend = async (accountId: string, name: string) => {
    const confirmed = await confirmDialog({
      title: `Suspend ${name}?`,
      text: "They will be hidden from the site and lose access.",
      confirmText: "Suspend",
      destructive: true,
    });
    if (!confirmed) return;

    const result = await dispatch(deleteGuide(accountId));
    if (deleteGuide.fulfilled.match(result)) {
      showToast.success(`${name} suspended.`);
    } else {
      showToast.error((result.payload as string) || "Could not suspend the guide.");
    }
  };

  // Reverse a suspension: restores the guide's access and puts them back on the
  // site.
  const handleReactivate = async (accountId: string, name: string) => {
    const confirmed = await confirmDialog({
      title: `Reactivate ${name}?`,
      text: "They will regain access and be listed on the site again.",
      confirmText: "Reactivate",
      icon: "question",
    });
    if (!confirmed) return;

    const result = await dispatch(reactivateGuide(accountId));
    if (reactivateGuide.fulfilled.match(result)) {
      showToast.success(`${name} reactivated.`);
    } else {
      showToast.error((result.payload as string) || "Could not reactivate the guide.");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Guides"
        description="Every guide account with its ID, contact details, and membership status."
      />

      {loading && guides.length === 0 ? (
        <SkeletonTable rows={6} columns={7} />
      ) : (
        <AdminPanel>
          <AdminToolbar
            stats={
              <span className="text-sm font-medium text-slate-500">
                {filtered.length} guide{filtered.length === 1 ? "" : "s"}
              </span>
            }
          >
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, ID, email, city…"
            />
          </AdminToolbar>

          {filtered.length === 0 ? (
            <EmptyState
              bare
              icon={Users}
              title={search ? "No matching guides" : "No guides yet"}
              description={
                search
                  ? "No guide matches your search. Try a different name, ID, email, or city."
                  : "Guide accounts will appear here as people register."
              }
            />
          ) : (
            <AdminTable>
              <AdminTableHead
                columns={[
                  "Guide ID",
                  "Name",
                  "Contact",
                  "City",
                  "Languages",
                  "Type",
                  "Membership",
                  "Account",
                  "Actions",
                ]}
              />
              <tbody>
                {filtered.map((g, i) => (
                  <AdminTableRow key={g.accountId} index={i}>
                    <AdminTableCell className="font-mono text-xs">
                      {g.guideCode ?? "—"}
                    </AdminTableCell>
                    <AdminTableCell>
                      {/* The detail page is where documents, notes, payment info
                          and cash payments live for this guide. */}
                      <Link
                        href={`/dashboard/admin/guides/${g.accountId}`}
                        className="font-semibold text-slate-900 hover:text-teal-700 hover:underline"
                      >
                        {g.name}
                      </Link>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminCellStack primary={g.email} secondary={g.phone ?? "—"} />
                    </AdminTableCell>
                    <AdminTableCell>{g.city || "—"}</AdminTableCell>
                    <AdminTableCell className="max-w-[200px] truncate">
                      {g.languages.length ? g.languages.join(", ") : "—"}
                    </AdminTableCell>
                    <AdminTableCell className="capitalize">{g.type}</AdminTableCell>
                    <AdminTableCell>
                      {g.membershipActive ? (
                        <AdminStatusBadge status="active" label="Active" tone="success" />
                      ) : g.membershipPendingActivation ? (
                        // Paid, but the 30-day clock only starts when an admin
                        // approves them — a queue to work, not a lapse.
                        <AdminStatusBadge
                          status="pending"
                          label="Awaiting approval"
                          tone="warning"
                        />
                      ) : g.registrationCompleted ? (
                        <AdminStatusBadge status="lapsed" label="Lapsed" tone="warning" />
                      ) : (
                        <AdminStatusBadge
                          status="unregistered"
                          label="Unregistered"
                          tone="neutral"
                        />
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      {g.isActive ? (
                        <AdminStatusBadge status="active" label="Active" tone="success" />
                      ) : (
                        <AdminStatusBadge status="disabled" label="Disabled" tone="danger" />
                      )}
                    </AdminTableCell>
                    <AdminTableCell last>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/admin/guides/${g.accountId}`}>View</Link>
                        </Button>
                        {g.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleSuspend(g.accountId, g.name)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => handleReactivate(g.accountId, g.name)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      )}
    </div>
  );
}
