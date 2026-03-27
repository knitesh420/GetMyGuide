"use client";

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/lib/store';
import { getMyGuideProfile, updateMyAvailability } from '@/lib/redux/thunks/guide/guideThunk';
import { toast } from 'react-toastify';
import { Calendar as CalendarIcon, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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
    const { myProfile, loading: profileLoading } = useSelector((state: RootState) => state.guide);

    const [selectedDays, setSelectedDays] = useState<Date[] | undefined>([]);
    const [unavailableDays, setUnavailableDays] = useState<Date[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        dispatch(getMyGuideProfile());
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
            })
            .catch((error) => {
                toast.error(`Failed to update schedule: ${error}`);
            });

        setIsSaving(false);
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
                           Set your unavailable dates. All other dates will be considered available for bookings.
                        </p>
                    </div>
                </section>

                <section className="pb-12">
                    <div className="container max-w-7xl mx-auto px-4">
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
                    </div>
                </section>
            </main>
        </div>
    );
}