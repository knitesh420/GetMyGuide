"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/lib/store";
import {
  fetchAssignableGuides,
  fetchGuideCalendar,
  fetchGuidesAvailability,
} from "@/lib/redux/thunks/assignment/assignmentThunks";
import { Badge } from "@/components/ui/badge";
import { AdminPanel, AdminSection, PageHeader } from "@/components/admin/ui";
import { Shimmer } from "@/components/animations/Skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuideCalendarView } from "@/components/availability/GuideCalendarView";
import { useAuth } from "@/lib/hooks/useAuth";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AdminGuideCalendarPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const { assignableGuides, guidesAvailability, selectedGuideCalendar, loading } = useSelector(
    (state: RootState) => state.assignments,
  );

  const [selectedGuideId, setSelectedGuideId] = useState<string>("");

  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchAssignableGuides());
    dispatch(fetchGuidesAvailability({ startDate: toLocalDateString(new Date()) }));
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (selectedGuideId) {
      dispatch(fetchGuideCalendar(selectedGuideId));
    }
  }, [dispatch, selectedGuideId]);

  if (authLoading || !isAuthenticated) return null;
  if (user && user.role !== "admin") return null;

  const availableGuides = guidesAvailability.filter((g) => g.isAvailable);
  const unavailableGuides = guidesAvailability.filter((g) => !g.isAvailable);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Guide Calendar"
        description="View a guide's booked trips, leave, and blocked dates before assigning them."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminPanel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Available Today ({availableGuides.length})
            </h2>
          </div>
          <div className="px-6 py-5">
            {loading && guidesAvailability.length === 0 ? (
              <Shimmer className="h-24 w-full" />
            ) : availableGuides.length === 0 ? (
              <p className="text-sm text-slate-500">No guides available today.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableGuides.map((g) => (
                  <Badge key={g.accountId} variant="secondary">
                    {g.name} {g.city ? `— ${g.city}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Unavailable / Conflict Alerts ({unavailableGuides.length})
            </h2>
          </div>
          <div className="px-6 py-5">
            {loading && guidesAvailability.length === 0 ? (
              <Shimmer className="h-24 w-full" />
            ) : unavailableGuides.length === 0 ? (
              <p className="text-sm text-slate-500">No conflicts today.</p>
            ) : (
              <div className="space-y-2">
                {unavailableGuides.map((g) => (
                  <div key={g.accountId} className="text-sm">
                    <span className="font-medium text-slate-900">{g.name}</span>
                    <span className="text-slate-500">
                      {" — "}
                      {g.conflicts.map((c) => c.reason ?? c.type).join("; ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel>
        <AdminSection title="Guide Calendar">
          <div className="space-y-4">
            <div className="max-w-sm">
              <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a guide to view their calendar" />
                </SelectTrigger>
                <SelectContent>
                  {assignableGuides.map((guide) => (
                    <SelectItem key={guide.accountId} value={guide.accountId}>
                      {guide.name} {guide.city ? `— ${guide.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGuideId ? (
              <GuideCalendarView calendar={selectedGuideCalendar} loading={loading} />
            ) : (
              <p className="text-sm text-slate-500">
                Select a guide above to view their availability calendar.
              </p>
            )}
          </div>
        </AdminSection>
      </AdminPanel>
    </div>
  );
}
