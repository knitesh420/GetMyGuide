"use client";

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
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
import { Calendar as CalendarIcon, CheckCircle, XCircle, RefreshCw, Info, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GuideLeaveForm } from '@/components/availability/GuideLeaveForm';
import { GuideLeaveList } from '@/components/availability/GuideLeaveList';
import { GuideLeaveType } from '@/lib/data';

// --- HELPER FUNCTION ---
// This function safely converts a Date object to a 'YYYY-MM-DD' string
// based on the user's local timezone, preventing UTC conversion errors.
const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


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
        unavailable: {
            backgroundColor: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
            textDecoration: 'line-through',
        }
    };

    if (profileLoading && !myProfile) {
        return (
            <div className="container max-w-7xl mx-auto px-4 py-10">
                <Skeleton className="h-12 w-1/3 mb-4" />
                <Skeleton className="h-6 w-2/3 mb-10" />
                <Card className="shadow-lg">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2 p-4 flex justify-center border-b lg:border-b-0 lg:border-r">
                            <Skeleton className="w-full h-[400px]" />
                        </div>
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Separator className="my-6"/>
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/50">
            <main className="pt-10">
                <section className="py-10">
                    <div className="container max-w-7xl mx-auto px-4">
                        <h1 className="text-4xl font-extrabold">My Schedule</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                           Manage your blocked dates, vacation/emergency leave, and working schedule. Admins see this before assigning you a trip.
                        </p>
                    </div>
                </section>

                <section className="pb-12">
                    <div className="container max-w-7xl mx-auto px-4">
                        <Tabs defaultValue="blocked-dates">
                            <TabsList>
                                <TabsTrigger value="blocked-dates">Blocked Dates</TabsTrigger>
                                <TabsTrigger value="leave">Vacation &amp; Emergency Leave</TabsTrigger>
                                <TabsTrigger value="schedule">Working Schedule</TabsTrigger>
                            </TabsList>

                            <TabsContent value="blocked-dates">
                                <Card className="shadow-lg">
                                   <div className="grid grid-cols-1 lg:grid-cols-3">
                                        {/* Left Side: Calendar */}
                                        <div className="lg:col-span-2 p-4 flex justify-center border-b lg:border-b-0 lg:border-r">
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
                                            <h3 className="text-xl font-bold mb-4">Update Your Schedule</h3>
                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-start gap-2 mb-6">
                                                <Info className="w-4 h-4 mt-0.5 shrink-0"/>
                                                <p>Select dates on the calendar, then mark them as available or unavailable.</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleSetAvailability(true)}>
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Selected as Available
                                                </Button>
                                                <Button className="w-full" variant="destructive" onClick={() => handleSetAvailability(false)}>
                                                    <XCircle className="w-4 h-4 mr-2" /> Mark Selected as Unavailable
                                                </Button>
                                            </div>

                                            <Separator className="my-6"/>

                                            <div className="space-y-3">
                                                <h4 className="font-semibold">Legend</h4>
                                                <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full border"/> Available</div>
                                                <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full" style={modifierStyles.unavailable}/> Unavailable</div>
                                                <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-primary"/> Selected</div>
                                            </div>

                                            <Separator className="my-6"/>

                                            <Button size="lg" className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                                                {isSaving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/>Saving...</> : 'Save All Changes'}
                                            </Button>
                                        </div>
                                   </div>
                                </Card>
                            </TabsContent>

                            <TabsContent value="leave">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card className="lg:col-span-1 p-6">
                                        <h3 className="text-xl font-bold mb-4">Request Leave</h3>
                                        <GuideLeaveForm onSubmit={handleRequestLeave} isSubmitting={isRequestingLeave} />
                                    </Card>
                                    <Card className="lg:col-span-2 p-6">
                                        <h3 className="text-xl font-bold mb-4">Your Leave Requests</h3>
                                        <GuideLeaveList
                                            leaves={myLeaves}
                                            onCancel={handleCancelLeave}
                                            cancellingId={cancellingId}
                                        />
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="schedule">
                                <Card className="p-6 max-w-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold">Weekly Working Schedule</h3>
                                        <Link href="/dashboard/guide/profile">
                                            <Button variant="outline" size="sm">
                                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit in Profile
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Available Days</p>
                                            <div className="flex flex-wrap gap-2">
                                                {myProfile?.availableDays?.length ? (
                                                    myProfile.availableDays.map((day) => (
                                                        <Badge key={day} variant="secondary">{day}</Badge>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Not set yet.</p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Working Hours</p>
                                            <div className="flex items-center gap-2 text-sm">
                                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                                {myProfile?.availableTime || 'Not set yet.'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>
            </main>
        </div>
    );
}
