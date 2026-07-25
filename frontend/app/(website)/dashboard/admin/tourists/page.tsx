"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { AppDispatch, RootState } from "@/lib/store";
import {
  activateTourist,
  deactivateTourist,
  fetchAdminTourists,
} from "@/lib/redux/thunks/tourist/adminTouristThunks";
import {
  createAssignment,
  fetchAssignableGuides,
  fetchBookingsAwaitingAssignment,
  fetchGuidesAvailability,
} from "@/lib/redux/thunks/assignment/assignmentThunks";
import { Button } from "@/components/ui/button";
import {
  AdminCellStack,
  AdminPanel,
  AdminSearchInput,
  AdminSection,
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
import { AssignGuideModal } from "@/components/assignment/AssignGuideModal";
import { showToast } from "@/lib/utils/toastHelper";
import { confirmDialog } from "@/lib/swal";
import { useAuth } from "@/lib/hooks/useAuth";
import { AdminBookingSummary } from "@/lib/data";

export default function AdminTouristsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { tourists, loading } = useSelector((state: RootState) => state.adminTourists);
  const { bookingsAwaitingAssignment, assignableGuides, guidesAvailability, loading: assignLoading } =
    useSelector((state: RootState) => state.assignments);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAdminTourists());
    dispatch(fetchBookingsAwaitingAssignment());
    dispatch(fetchAssignableGuides());
  }, [dispatch, isAuthenticated]);

  // Awaiting bookings grouped by the linked tourist account so each tourist row
  // can show how many of its bookings still need a guide. Guest bookings (no
  // linked_to) are surfaced separately in the awaiting section below.
  const awaitingByTourist = useMemo(() => {
    const map = new Map<string, AdminBookingSummary[]>();
    for (const b of bookingsAwaitingAssignment) {
      if (!b.linked_to) continue;
      const list = map.get(b.linked_to) ?? [];
      list.push(b);
      map.set(b.linked_to, list);
    }
    return map;
  }, [bookingsAwaitingAssignment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tourists;
    return tourists.filter((t) =>
      [t.name, t.email, t.touristCode ?? "", t.nationality, t.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [tourists, search]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  const openAssign = (booking: AdminBookingSummary) => {
    setSelectedBookingId(booking.id);
    setModalOpen(true);
    dispatch(fetchGuidesAvailability({ startDate: booking.travel_details.date }));
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBookingId(null);
  };

  const handleAssign = async (
    guideId: string,
    adminNotes?: string,
    override?: boolean,
    overrideReason?: string,
  ) => {
    if (!selectedBookingId) return;
    const result = await dispatch(
      createAssignment({ bookingId: selectedBookingId, guideId, adminNotes, override, overrideReason }),
    );
    if (createAssignment.fulfilled.match(result)) {
      showToast.success("Guide assigned");
      closeModal();
      dispatch(fetchBookingsAwaitingAssignment());
    } else {
      showToast.error((result.payload as string) || "Failed to assign guide");
    }
  };

  // Suspending an account is reversible (it only flips `isActive`), but it does
  // lock the tourist out immediately — so it still asks first.
  const handleToggleAccount = async (accountId: string, name: string, isActive: boolean) => {
    if (isActive) {
      const confirmed = await confirmDialog({
        title: `Suspend ${name}'s account?`,
        text: "They will lose access until you restore it.",
        confirmText: "Suspend",
        destructive: true,
      });
      if (!confirmed) return;
    }

    const result = isActive
      ? await dispatch(deactivateTourist(accountId))
      : await dispatch(activateTourist(accountId));

    const ok = isActive
      ? deactivateTourist.fulfilled.match(result)
      : activateTourist.fulfilled.match(result);

    if (ok) {
      showToast.success(isActive ? `${name} suspended.` : `${name} restored.`);
    } else {
      showToast.error((result.payload as string) || "Could not change the account status.");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Tourists"
        description="Every tourist with their ID, and a guide-assignment shortcut for their pending bookings."
      />

      <AdminPanel>
        <AdminSection title="Assign a Guide by Tourist">
          {bookingsAwaitingAssignment.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings currently need a guide.</p>
          ) : (
            <div className="space-y-3">
              {bookingsAwaitingAssignment.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {booking.tourist_info.name} — {booking.travel_details.city}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(booking.travel_details.date).toLocaleDateString()} ·{" "}
                      {booking.travel_details.no_of_person} traveler(s)
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs text-slate-400">
                      <span>Tourist: {booking.touristCode ?? "—"}</span>
                      <span>Booking: {booking.bookingCode ?? "—"}</span>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openAssign(booking)} className="shrink-0">
                    Assign Guide
                  </Button>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </AdminPanel>

      {loading && tourists.length === 0 ? (
        <SkeletonTable rows={6} columns={7} />
      ) : (
        <AdminPanel>
          <AdminToolbar
            stats={
              <span className="text-sm font-medium text-slate-500">
                {filtered.length} tourist{filtered.length === 1 ? "" : "s"}
              </span>
            }
          >
            <AdminSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, ID, email…"
            />
          </AdminToolbar>

          {filtered.length === 0 ? (
            <EmptyState
              bare
              icon={UserRound}
              title={search ? "No matching tourists" : "No tourists yet"}
              description={
                search
                  ? "No tourist matches your search. Try a different name, ID, or email."
                  : "Tourist accounts will appear here as people register."
              }
            />
          ) : (
            <AdminTable>
              <AdminTableHead
                columns={[
                  "Tourist ID",
                  "Name",
                  "Contact",
                  "Nationality",
                  "Registration",
                  "Account",
                  "Pending",
                  "Actions",
                ]}
              />
              <tbody>
                {filtered.map((t, i) => {
                  const awaiting = awaitingByTourist.get(t.accountId) ?? [];
                  const isActive = t.isActive !== false;
                  return (
                    <AdminTableRow key={t.accountId} index={i}>
                      <AdminTableCell className="font-mono text-xs">
                        {t.touristCode ?? "—"}
                      </AdminTableCell>
                      <AdminTableCell className="font-semibold text-slate-900">
                        {t.name}
                      </AdminTableCell>
                      <AdminTableCell>
                        <AdminCellStack primary={t.email} secondary={t.phone ?? "—"} />
                      </AdminTableCell>
                      <AdminTableCell>{t.nationality || "—"}</AdminTableCell>
                      <AdminTableCell>
                        {t.registrationCompleted ? (
                          <AdminStatusBadge status="complete" label="Complete" tone="success" />
                        ) : (
                          <AdminStatusBadge status="incomplete" label="Incomplete" tone="warning" />
                        )}
                      </AdminTableCell>
                      <AdminTableCell>
                        {isActive ? (
                          <AdminStatusBadge status="active" label="Active" tone="success" />
                        ) : (
                          <AdminStatusBadge status="suspended" label="Suspended" tone="danger" />
                        )}
                      </AdminTableCell>
                      <AdminTableCell>
                        {awaiting.length > 0 ? (
                          <Button size="sm" variant="outline" onClick={() => openAssign(awaiting[0])}>
                            Assign ({awaiting.length})
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </AdminTableCell>
                      <AdminTableCell last>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={
                              isActive
                                ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                                : "text-green-700 hover:bg-green-50"
                            }
                            onClick={() => handleToggleAccount(t.accountId, t.name, isActive)}
                          >
                            {isActive ? "Suspend" : "Restore"}
                          </Button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </AdminTable>
          )}
        </AdminPanel>
      )}

      <AssignGuideModal
        isOpen={modalOpen}
        onClose={closeModal}
        onAssign={handleAssign}
        guides={assignableGuides}
        isLoading={assignLoading}
        title="Assign a Guide"
        description="Choose a guide to propose for this booking."
        availability={guidesAvailability}
      />
    </div>
  );
}
