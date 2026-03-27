"use client";

import { FC } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const BookingSuccessPage: FC = () => {
    const { latestBooking } = useSelector((state: RootState) => state.tourGuideBooking);

    if (!latestBooking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold mb-4">No booking details found.</h1>
                <p className="text-muted-foreground mb-6">Please start the booking process again.</p>
                <Button asChild>
                    <Link href="/"><Home className="mr-2 h-4 w-4" /> Go to Homepage</Link>
                </Button>
            </div>
        );
    }

    // ✅ FIXED: Safely access populated data
    // Hum check kar rahe hain ki 'guide' ek object hai ya nahi, uske baad hi '.name' access kar rahe hain.
    const guideName = latestBooking.guide && typeof latestBooking.guide === 'object'
        ? latestBooking.guide.name
        : 'Details Loading...';

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black py-12">
            <div className="text-center p-8 max-w-2xl mx-auto bg-background rounded-xl shadow-2xl border">
                <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-6" />
                <h1 className="text-4xl font-extrabold mb-3">Booking Confirmed!</h1>
                <p className="text-lg text-muted-foreground mb-8">
                    Your tour is booked. An email confirmation has been sent to you.
                </p>

                <div className="text-left p-6 border bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4 mb-8">
                    <h3 className="text-xl font-semibold">Booking Summary</h3>
                    <p><strong>Booking ID:</strong> {latestBooking._id}</p>
                    <p><strong>Guide:</strong> {guideName}</p> {/* ✅ Use the safe variable */}
                    <p><strong>Location:</strong> {latestBooking.location}</p> {/* ✅ Now this works */}
                    <p><strong>Dates:</strong> {format(new Date(latestBooking.startDate), 'PPP')} to {format(new Date(latestBooking.endDate), 'PPP')}</p>
                    <p><strong>Status:</strong> <span className="font-semibold text-primary">{latestBooking.paymentStatus}</span></p>
                </div>
                
                <div className="flex justify-center gap-4">
                    <Button asChild variant="outline">
                        <Link href="/"><Home className="mr-2 h-4 w-4" /> Go to Homepage</Link>
                    </Button> 
                    <Button asChild>
                        <Link href="/dashboard/user/tour-guide-booking"><Calendar className="mr-2 h-4 w-4" /> View My Bookings</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
};

export default BookingSuccessPage;