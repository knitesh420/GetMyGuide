"use client";

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/lib/store';
import {
  getMyGuideProfile,
  updateMyAvailability,
  createMyLeave,
  fetchMyLeaves,
  cancelMyLeave,
  fetchMyGuideCalendar,
} from '@/lib/redux/thunks/guide/guideThunk';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, RefreshCw, Info, CalendarOff, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuideLeaveForm } from '@/components/availability/GuideLeaveForm';
import { GuideLeaveList } from '@/components/availability/GuideLeaveList';
import { GuideLeaveType } from '@/lib/data';
import {
  GuidePageHeader,
  GuidePanel,
  GuideStat,
  GuideStatStrip,
} from '@/components/guide';

// --- HELPER FUNCTION ---
// This function safely converts a Date object to a 'YYYY-MM-DD' string
// based on the user's local timezone, preventing UTC conversion errors.
const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Literal colours rather than `hsl(var(--destructive))`: --destructive holds an
// oklch() value, so wrapping it in hsl() produces invalid CSS and the day never
// gets highlighted.
const UNAVAILABLE_DAY_STYLE = {
    backgroundColor: 'rgb(254 226 226)', // red-100
    color: 'rgb(185 28 28)', // red-700
    textDecoration: 'line-through',
} as const;

export default function GuideAvailabilityPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { myProfile, myLeaves, loading: profileLoading } = useSelector((state: RootState) => state.guide);

    const [selectedDays, setSelectedDays] = useState<Date[] | undefined>([]);
    const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isRequestingLeave, setIsRequestingLeave] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(getMyGuideProfile());
        dispatch(fetchMyLeaves());
        dispatch(fetchMyGuideCalendar());
    }, [dispatch]);

    useEffect(() => {
        if (myProfile?.unavailableDates) {
            // Backend strings are UTC, new Date() correctly parses them into local time Date objects.
            const dates = myProfile.unavailableDates.map(d => new Date(d));
            setUnavailableDays(dates);
        }
    }, [myProfile]);

    const handleSetAvailability = (isAvailable: boolean) => {
        if (!selectedDays || selectedDays.length === 0) {
            toast.info("Please select one or more dates on the calendar first.");
            return;
        }

        // FIX: Use the safe `toLocalDateString` helper function for all conversions.
        const selectedDateStrings = selectedDays.map(toLocalDateString);
        const currentUnavailableStrings = new Set(unavailableDays.map(toLocalDateString));

        if (isAvailable) {
            selectedDateStrings.forEach(date => currentUnavailableStrings.delete(date));
            toast.success(`${selectedDays.length} day(s) marked as available.`);
        } else {
            selectedDateStrings.forEach(date => currentUnavailableStrings.add(date));
            toast.success(`${selectedDays.length} day(s) marked as unavailable.`);
        }

        // This correctly creates a local Date object from the string, which is what the calendar needs.
        const newUnavailableDates = Array.from(currentUnavailableStrings).map(ds => new Date(ds + 'T00:00:00'));
        setUnavailableDays(newUnavailableDates);
        setSelectedDays([]);
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);

        // FIX: Use the safe `toLocalDateString` helper function before sending to the backend.
        const unavailableDateStrings = unavailableDays.map(toLocalDateString);

        await dispatch(updateMyAvailability({ unavailableDates: unavailableDateStrings }))
            .unwrap()
            .then(() => {
                toast.success("Your schedule has been updated successfully!");
                dispatch(fetchMyGuideCalendar());
            })
            .catch((error) => {
                toast.error(`Failed to update schedule: ${error}`);
            });

        setIsSaving(false);
    };

    const handleRequestLeave = async (data: { type: GuideLeaveType; startDate: string; endDate: string; reason?: string }) => {
        setIsRequestingLeave(true);
        await dispatch(createMyLeave(data))
            .unwrap()
            .then(() => {
                toast.success("Leave requested successfully!");
                dispatch(fetchMyGuideCalendar());
            })
            .catch((error) => {
                toast.error(`Failed to request leave: ${error}`);
            });
        setIsRequestingLeave(false);
    };

    const handleCancelLeave = async (leaveId: string) => {
        setCancellingId(leaveId);
        await dispatch(cancelMyLeave(leaveId))
            .unwrap()
            .then(() => {
                toast.success("Leave cancelled.");
                dispatch(fetchMyGuideCalendar());
            })
            .catch((error) => {
                toast.error(`Failed to cancel leave: ${error}`);
            });
        setCancellingId(null);
    };

    const modifiers = {
        unavailable: unavailableDays,
    };
    const modifierStyles = {
        unavailable: UNAVAILABLE_DAY_STYLE,
    };

    if (profileLoading && !myProfile) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-[420px]" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <GuidePageHeader
                title="My Schedule"
                description="Manage your blocked dates and your vacation and emergency leave. Admins see this before assigning you a trip."
            />

            <GuidePanel>
                <div className="border-b border-slate-200 px-5 py-4">
                    <GuideStatStrip>
                        <GuideStat
                            icon={CalendarOff}
                            label="Blocked Dates"
                            value={unavailableDays.length}
                        />
                        <GuideStat
                            icon={CalendarDays}
                            label="Leave Requests"
                            value={myLeaves?.length ?? 0}
                            accent
                        />
                    </GuideStatStrip>
                </div>
            </GuidePanel>

            <Tabs defaultValue="blocked-dates" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="blocked-dates">Blocked Dates</TabsTrigger>
                    <TabsTrigger value="leave">Vacation &amp; Emergency Leave</TabsTrigger>
                </TabsList>

                <TabsContent value="blocked-dates">
                    <GuidePanel>
                        <div className="grid grid-cols-1 lg:grid-cols-3">
                            {/* Left Side: Calendar */}
                            <div className="flex justify-center border-b border-slate-200 p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
                                <Calendar
                                    mode="multiple"
                                    min={0}
                                    selected={selectedDays}
                                    onSelect={setSelectedDays}
                                    modifiers={modifiers}
                                    modifiersStyles={modifierStyles}
                                    numberOfMonths={2}
                                    className="p-3"
                                />
                            </div>

                            {/* Right Side: Action Panel */}
                            <div className="p-6">
                                <h3 className="mb-4 text-lg font-bold text-slate-900">Update Your Schedule</h3>
                                <div className="mb-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0"/>
                                    <p>Select dates on the calendar, then mark them as available or unavailable.</p>
                                </div>

                                <div className="space-y-3">
                                    <Button className="w-full" onClick={() => handleSetAvailability(true)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Mark Selected as Available
                                    </Button>
                                    <Button
                                        className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                        variant="outline"
                                        onClick={() => handleSetAvailability(false)}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Mark Selected as Unavailable
                                    </Button>
                                </div>

                                <Separator className="my-6"/>

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-slate-900">Legend</h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-600"><div className="h-4 w-4 rounded-full border border-slate-300"/> Available</div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600"><div className="h-4 w-4 rounded-full" style={UNAVAILABLE_DAY_STYLE}/> Unavailable</div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600"><div className="h-4 w-4 rounded-full bg-primary"/> Selected</div>
                                </div>

                                <Separator className="my-6"/>

                                <Button size="lg" className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save All Changes'}
                                </Button>
                            </div>
                        </div>
                    </GuidePanel>
                </TabsContent>

                <TabsContent value="leave">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <GuidePanel className="p-6 lg:col-span-1">
                            <h3 className="mb-4 text-lg font-bold text-slate-900">Request Leave</h3>
                            <GuideLeaveForm onSubmit={handleRequestLeave} isSubmitting={isRequestingLeave} />
                        </GuidePanel>
                        <GuidePanel className="p-6 lg:col-span-2">
                            <h3 className="mb-4 text-lg font-bold text-slate-900">Your Leave Requests</h3>
                            <GuideLeaveList
                                leaves={myLeaves}
                                onCancel={handleCancelLeave}
                                cancellingId={cancellingId}
                            />
                        </GuidePanel>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
