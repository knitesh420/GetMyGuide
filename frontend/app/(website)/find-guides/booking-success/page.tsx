"use client";

import { FC, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Compass } from 'lucide-react';
import { format } from 'date-fns';

import { AnimatedCheck } from '@/components/animations/StatusIcons';
import BookingTicket from '@/components/animations/BookingTicket';
import { AnimatedCompass } from '@/components/animations/travel';
import { celebrate } from '@/lib/confetti';
import { EASE_OUT, staggerParent } from '@/lib/motion';

const BookingSuccessPage: FC = () => {
    const { latestBooking } = useSelector((state: RootState) => state.tourGuideBooking);

    // Only celebrate once a real booking is in the store.
    useEffect(() => {
        if (latestBooking?._id) {
            const timer = setTimeout(() => celebrate(), 400);
            return () => clearTimeout(timer);
        }
    }, [latestBooking?._id]);

    if (!latestBooking) {
        return (
            <motion.div
                className="min-h-screen flex flex-col items-center justify-center text-center p-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
            >
                <AnimatedCompass size={88} className="mb-6" />
                <h1 className="text-2xl font-bold mb-4">No booking details found.</h1>
                <p className="text-muted-foreground mb-6">Please start the booking process again.</p>
                <Button asChild>
                    <Link href="/"><Home className="mr-2 h-4 w-4" /> Go to Homepage</Link>
                </Button>
            </motion.div>
        );
    }

    // ✅ FIXED: Safely access populated data
    // Hum check kar rahe hain ki 'guide' ek object hai ya nahi, uske baad hi '.name' access kar rahe hain.
    const guideName = latestBooking.guide && typeof latestBooking.guide === 'object'
        ? latestBooking.guide.name
        : 'Details Loading...';

    const ticketRows = [
        { label: 'Guide', value: guideName },
        { label: 'Location', value: latestBooking.location },
        {
            label: 'Dates',
            value: `${format(new Date(latestBooking.startDate), 'PPP')} → ${format(new Date(latestBooking.endDate), 'PPP')}`,
        },
        {
            label: 'Status',
            value: <span className="font-semibold text-primary capitalize">{latestBooking.paymentStatus}</span>,
        },
    ];

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black py-12 px-4">
            <div className="w-full max-w-2xl mx-auto">
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
                        <AnimatedCheck size={88} />
                    </motion.div>
                    <motion.h1
                        className="text-4xl font-extrabold mb-3"
                        variants={{
                            hidden: { opacity: 0, y: 16 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                        }}
                    >
                        Booking Confirmed!
                    </motion.h1>
                    <motion.p
                        className="text-lg text-muted-foreground"
                        variants={{
                            hidden: { opacity: 0, y: 16 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                        }}
                    >
                        Your tour is booked. An email confirmation has been sent to you.
                    </motion.p>
                </motion.div>

                <BookingTicket
                    title={guideName}
                    subtitle={latestBooking.location}
                    bookingId={latestBooking._id}
                    rows={ticketRows}
                />

                <motion.div
                    className="mt-8 flex flex-col sm:flex-row justify-center gap-3"
                    variants={staggerParent(0.08, 1.1)}
                    initial="hidden"
                    animate="visible"
                >
                    {[
                        { href: '/dashboard/user/my-bookings', label: 'View My Bookings', icon: Calendar, primary: true },
                        { href: '/find-guides', label: 'Continue Exploring', icon: Compass, primary: false },
                        { href: '/', label: 'Go to Homepage', icon: Home, primary: false },
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
                            <Button asChild variant={primary ? 'default' : 'outline'} className="w-full">
                                <Link href={href}><Icon className="mr-2 h-4 w-4" /> {label}</Link>
                            </Button>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </main>
    );
};

export default BookingSuccessPage;
