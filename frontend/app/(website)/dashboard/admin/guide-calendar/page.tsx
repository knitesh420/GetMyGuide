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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex-1 space-y-8 p-4 sm:p-6 md:p-8 bg-muted/40">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Guide Calendar</h2>
        <p className="text-muted-foreground">
          View a guide&apos;s booked trips, leave, and blocked dates before assigning them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Available Today ({availableGuides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && guidesAvailability.length === 0 ? (
              <Skeleton className="h-24" />
            ) : availableGuides.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guides available today.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableGuides.map((g) => (
                  <Badge key={g.accountId} variant="secondary">
                    {g.name} {g.city ? `— ${g.city}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Unavailable / Conflict Alerts ({unavailableGuides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && guidesAvailability.length === 0 ? (
              <Skeleton className="h-24" />
            ) : unavailableGuides.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conflicts today.</p>
            ) : (
              <div className="space-y-2">
                {unavailableGuides.map((g) => (
                  <div key={g.accountId} className="text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">
                      {" — "}
                      {g.conflicts.map((c) => c.reason ?? c.type).join("; ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guide Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-sm text-muted-foreground">Select a guide above to view their availability calendar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
