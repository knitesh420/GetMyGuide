"use client"

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { RootState, AppDispatch } from '@/lib/store';
import { fetchBookingById } from '@/lib/redux/thunks/booking/bookingThunks';

import { Button } from '@/components/ui/button';
import { Calendar, User, ArrowRight, AlertTriangle, Compass, Ticket } from 'lucide-react';

import { AnimatedCheck } from '@/components/animations/StatusIcons';
import BookingTicket from '@/components/animations/BookingTicket';
import { Shimmer } from '@/components/animations/Skeletons';
import { RotatingGlobe } from '@/components/animations/travel';
import { celebrate } from '@/lib/confetti';
import { EASE_OUT, staggerParent } from '@/lib/motion';

/** Placeholder shown while the booking is being fetched — mirrors the ticket. */
function SuccessSkeleton() {
    return (
        <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <RotatingGlobe size={72} />
            <p className="text-sm font-medium text-muted-foreground">Confirming your booking details…</p>
            <div className="w-full rounded-3xl border border-slate-100 bg-white p-6 space-y-4">
                <Shimmer className="h-5 w-2/3" />
                <Shimmer className="h-3 w-1/2" />
                <div className="space-y-3 pt-2">
                    <Shimmer className="h-3 w-full" />
                    <Shimmer className="h-3 w-full" />
                    <Shimmer className="h-3 w-3/4" />
                </div>
            </div>
        </div>
    );
}

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

    // Celebrate once, only after the booking has actually come back confirmed —
    // firing on mount would congratulate people whose fetch then fails.
    useEffect(() => {
        if (currentBooking?._id) {
            const timer = setTimeout(() => celebrate(), 400);
            return () => clearTimeout(timer);
        }
    }, [currentBooking?._id]);

    // 1. Loading State
    if (loading) {
        return <SuccessSkeleton />;
    }

    // 2. Error State
    if (error) {
        return (
            <motion.div
                className="text-center text-destructive-foreground bg-destructive p-6 rounded-lg"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
            >
                <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">Error Fetching Booking</h2>
                <p>{error}</p>
                <Button asChild variant="secondary" className="mt-4">
                    <Link href="/dashboard/user/my-bookings">Go to My Bookings</Link>
                </Button>
            </motion.div>
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

    // 4. Success State — a package booking carries package/guide info plus the
    // travel date and the advance/balance split.
    const tourTitle = currentBooking.package_info?.title ?? "Your Tour";
    const guideName = currentBooking.guide_info?.name ?? "Your Guide";
    const guidePhoto = currentBooking.guide_info?.photo || "/placeholder.svg";
    const startDate = currentBooking.travel_details?.date;
    const advancePaid = currentBooking.advance_paid;
    const balanceDue = currentBooking.balance_due;
    const currency = "₹";

    const formattedDate = startDate
        ? new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'To be confirmed';

    const ticketRows = [
        {
            label: 'Start Date',
            value: (
                <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {formattedDate}
                </span>
            ),
        },
        {
            label: 'Your Guide',
            value: (
                <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    {guideName}
                </span>
            ),
        },
        ...(advancePaid != null || balanceDue != null
            ? [{
                label: 'Payment',
                value: (
                    <span>
                        {currency}{(advancePaid ?? 0).toLocaleString()} advance paid
                        {balanceDue != null && balanceDue > 0 && (
                            <span className="block text-xs font-medium text-muted-foreground">
                                {currency}{balanceDue.toLocaleString()} balance due
                            </span>
                        )}
                    </span>
                ),
            }]
            : []),
    ];

    return (
        <div className="max-w-3xl mx-auto">
            <motion.div
                className="text-center mb-8"
                variants={staggerParent(0.12)}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="flex justify-center mb-4"
                    variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                >
                    <AnimatedCheck size={96} />
                </motion.div>
                <motion.h1
                    className="text-4xl font-extrabold text-foreground"
                    variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                    }}
                >
                    Booking Confirmed!
                </motion.h1>
                <motion.p
                    className="mt-2 text-lg text-muted-foreground"
                    variants={{
                        hidden: { opacity: 0, y: 16 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                    }}
                >
                    Your adventure is booked. Get ready for an unforgettable experience!
                </motion.p>
            </motion.div>

            <BookingTicket
                title={tourTitle}
                subtitle={`with ${guideName}`}
                bookingId={currentBooking._id}
                rows={ticketRows}
                footer={
                    <Image
                        src={guidePhoto}
                        alt={guideName}
                        width={48}
                        height={48}
                        className="rounded-full shadow-md shrink-0"
                    />
                }
            />

            <motion.div
                className="mt-8 flex flex-col sm:flex-row justify-center gap-3"
                variants={staggerParent(0.08, 1.1)}
                initial="hidden"
                animate="visible"
            >
                {[
                    {
                        href: `/dashboard/user/my-bookings/${currentBooking._id}`,
                        label: 'View Booking',
                        icon: Ticket,
                        primary: true,
                    },
                    { href: '/dashboard/user', label: 'Go to Dashboard', icon: ArrowRight, primary: false },
                    { href: '/services', label: 'Continue Exploring', icon: Compass, primary: false },
                ].map(({ href, label, icon: Icon, primary }) => (
                    <motion.div
                        key={href}
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <Button
                            asChild
                            size="lg"
                            variant={primary ? 'default' : 'outline'}
                            className={`w-full ${primary ? 'red-gradient' : ''}`}
                        >
                            <Link href={href}>
                                <Icon className="mr-2 w-4 h-4" />
                                {label}
                            </Link>
                        </Button>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export default function BookingSuccessPage() {
    return (
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
            <div className="container mx-auto px-4 py-12">
                <Suspense fallback={<SuccessSkeleton />}>
                    <SuccessContent />
                </Suspense>
            </div>
        </div>
    );
}
