"use client"

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchBookingById } from '@/lib/redux/thunks/booking/bookingThunks';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, User, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

function SuccessContent() {
    const searchParams = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();
    const bookingId = searchParams.get('bookingId');

    const { currentBooking, loading, error } = useSelector((state: RootState) => state.bookings);

    useEffect(() => {
        if (bookingId) {
            // When the component loads, dispatch the thunk to fetch the data
            dispatch(fetchBookingById(bookingId));
        }
    }, [bookingId, dispatch]);

    // 1. Loading State
    if (loading) {
        return (
            <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Confirming your booking details...</p>
            </div>
        );
    }
    
    // 2. Error State
    if (error) {
        return (
            <div className="text-center text-destructive-foreground bg-destructive p-6 rounded-lg">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Error Fetching Booking</h2>
                <p>{error}</p>
                <Button asChild variant="secondary" className="mt-4">
                    <Link href="/dashboard/user/my-bookings">Go to My Bookings</Link>
                </Button>
            </div>
        );
    }

    // 3. Data Not Found State
    if (!currentBooking) {
        return (
            <div className="text-center text-destructive">
                Booking details could not be found. Please check your bookings page.
            </div>
        );
    }

    // 4. Success State (using live data from currentBooking)
    const { tour, guide, startDate, _id } = currentBooking;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
                <CheckCircle className="w-24 h-24 mx-auto text-green-500 mb-4" />
                <h1 className="text-4xl font-extrabold text-foreground">Booking Confirmed!</h1>
                <p className="mt-2 text-lg text-muted-foreground">Your adventure is booked. Get ready for an unforgettable experience!</p>
            </div>

            <Card className="overflow-hidden shadow-lg">
                <CardContent className="p-6 space-y-4">
                    <h3 className="text-2xl font-bold">{tour.title}</h3>
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="font-semibold">Start Date</p>
                                    <p className="text-muted-foreground">{new Date(startDate!).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="font-semibold">Your Assigned Guide</p>
                                    <p className="text-muted-foreground">{guide.name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-center">
                            <Image src={guide.photo} alt={guide.name} width={80} height={80} className="rounded-full mx-auto shadow-md" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg" className="red-gradient">
                    <Link href={`/dashboard/user`}>
                        Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard/user/my-bookings">Go to My Bookings</Link>
                </Button>
            </div>
        </div>
    );
}

export default function BookingSuccessPage() {
    return (
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
            <div className="container mx-auto px-4 py-12 animate-fade-in-up">
                <Suspense fallback={<div className="text-center">Loading confirmation...</div>}>
                    <SuccessContent />
                </Suspense>
            </div>
        </div>
    );
}