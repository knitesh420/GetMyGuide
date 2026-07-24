"use client";

import { FC, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import {
  createAndVerifyBooking,
  fetchBookingQuote,
  BookingCreationData,
  BookingQuote,
} from '@/lib/redux/thunks/tourGuideBooking/tourGuideBookingThunk';
import { clearBookingState } from '@/lib/redux/tourGuideBookingSlice';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { showWarning } from '@/lib/swal';
import { format } from 'date-fns';

import PaymentProcessing from '@/components/animations/PaymentProcessing';
import PaymentFailure from '@/components/animations/PaymentFailure';
import { Shimmer } from '@/components/animations/Skeletons';
import { JourneyProgress } from '@/components/animations/travel';
import { EASE_OUT, staggerParent } from '@/lib/motion';

const CheckoutPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch: AppDispatch = useDispatch();

  const { loading, error } = useSelector((state: RootState) => state.tourGuideBooking);

  // --- State for the form ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // The price is deliberately NOT read from the URL. It is quoted by the server
  // from the guide's published rate, and re-derived there again at payment — a
  // `totalPrice` query param would just be a number the tourist could edit.
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Presentation-only: lets the failure panel be dismissed without clearing the
  // slice error that the inline message below still reads from.
  const [failureDismissed, setFailureDismissed] = useState(false);

  // --- Extract data from URL ---
  const bookingDetails = useMemo(() => ({
    guideId: searchParams.get('guideId')!,
    guideName: searchParams.get('guideName')!,
    location: searchParams.get('location')!,
    language: searchParams.get('language')!,
    startDate: new Date(searchParams.get('startDate')!),
    endDate: new Date(searchParams.get('endDate')!),
    numTravelers: parseInt(searchParams.get('numTravelers') || '1', 10),
    guidePhoto: searchParams.get('guidePhoto')!,
  }), [searchParams]);

  // --- Load Razorpay script dynamically ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Clear any previous booking state when component mounts
    dispatch(clearBookingState());
  }, [dispatch]);

  useEffect(() => {
    if (!bookingDetails.guideId) return;

    dispatch(
      fetchBookingQuote({
        guideId: bookingDetails.guideId,
        startDate: bookingDetails.startDate.toISOString(),
        endDate: bookingDetails.endDate.toISOString(),
      }),
    ).then((result) => {
      if (fetchBookingQuote.fulfilled.match(result)) {
        setQuote(result.payload);
        setQuoteError(null);
      } else {
        setQuoteError((result.payload as string) || 'Could not price this booking.');
      }
    });
  }, [dispatch, bookingDetails.guideId, bookingDetails.startDate, bookingDetails.endDate]);

  const advanceAmount = quote?.advance ?? 0;

  const handlePlaceOrder = async () => {
    // The thunk holds `loading` for the whole order → Razorpay → verify cycle,
    // so this is also the duplicate-submit guard.
    if (loading) return;

    if (!fullName || !email || !phone) {
      showWarning('Missing details', 'Please fill in all contact details.');
      return;
    }

    // A fresh attempt re-arms the failure panel for whatever comes back.
    setFailureDismissed(false);

    const bookingData: BookingCreationData = {
      guideId: bookingDetails.guideId,
      location: bookingDetails.location,
      language: bookingDetails.language,
      startDate: bookingDetails.startDate.toISOString(),
      endDate: bookingDetails.endDate.toISOString(),
      numberOfTravelers: bookingDetails.numTravelers,
      contactInfo: { fullName, email, phone },
    };

    try {
      // The thunk will handle everything. We just need to wait for its result.
      await dispatch(createAndVerifyBooking(bookingData)).unwrap();
      // On success, the thunk will resolve. We can then navigate.
      router.push('/find-guides/booking-success');
    } catch (rejectedValueOrSerializedError) {
      // unwrap() throws an error if the thunk is rejected.
      // The error state is already set in the slice, so we just log it.
      console.error('Booking failed:', rejectedValueOrSerializedError);
    }
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black py-16 md:py-24">
      <PaymentProcessing open={loading} />
      <PaymentFailure
        open={!!error && !loading && !failureDismissed}
        reason={error}
        onRetry={() => {
          handlePlaceOrder();
        }}
        onBack={() => setFailureDismissed(true)}
      />

      <div className="container max-w-4xl mx-auto px-4">
        <JourneyProgress
          steps={["Find Guide", "Choose Dates", "Checkout", "Confirmed"]}
          current={2}
          className="mb-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Confirm Your Booking</CardTitle>
            </CardHeader>
            <motion.div variants={staggerParent(0.1, 0.15)} initial="hidden" animate="visible">
              <CardContent className="grid md:grid-cols-2 gap-8 lg:gap-12 p-8">
                {/* Left Side: Booking Summary */}
                <motion.div className="space-y-6" variants={fadeUpItem}>
                  <h3 className="text-xl font-semibold border-b pb-2">Your Itinerary</h3>
                  <div className="flex items-center gap-4">
                    <Image src={bookingDetails.guidePhoto} alt={bookingDetails.guideName} width={80} height={80} className="rounded-full border-2 border-primary" />
                    <div>
                      <p className="font-bold text-lg">{bookingDetails.guideName}</p>
                      <p className="text-muted-foreground">{bookingDetails.location} | {bookingDetails.language}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Dates:</strong> {format(bookingDetails.startDate, "PPP")} to {format(bookingDetails.endDate, "PPP")}</p>
                    <p><strong>Guests:</strong> {bookingDetails.numTravelers} traveler(s)</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2">
                    {quoteError ? (
                      <p className="text-sm text-destructive">{quoteError}</p>
                    ) : !quote ? (
                      // Shaped placeholder rather than a line of text, so the
                      // panel doesn't resize when the real quote lands.
                      <div className="space-y-2" role="status" aria-label="Pricing your booking">
                        <Shimmer className="h-3.5 w-full" />
                        <Shimmer className="h-3.5 w-2/3" />
                        <Shimmer className="h-5 w-1/2" />
                      </div>
                    ) : (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}
                      >
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>
                            ₹{quote.dayRate.toLocaleString('en-IN')} × {quote.days} day
                            {quote.days === 1 ? '' : 's'}
                          </span>
                          <span>₹{quote.totalPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between"><span>Total Price:</span> <span>₹{quote.totalPrice.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Advance Payable (20%):</span>
                          <span className="text-primary">₹{advanceAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The remaining ₹{quote.balance.toLocaleString('en-IN')} is payable before your
                          trip.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Right Side: Contact Form */}
                <motion.div className="space-y-6" variants={fadeUpItem}>
                  <h3 className="text-xl font-semibold border-b pb-2">Contact Information</h3>
                  <div className="space-y-4">
                    <div><Label htmlFor="fullName">Full Name</Label><Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your name" /></div>
                    <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                    <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 12345 67890" /></div>
                  </div>
                </motion.div>
              </CardContent>
            </motion.div>
            <CardFooter className="flex flex-col gap-4 p-8 bg-gray-50 dark:bg-gray-900/50">
              {error && (
                <motion.div
                  className="text-destructive text-center p-3 bg-destructive/10 rounded-md flex items-center gap-2"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <AlertCircle className="h-5 w-5" /> {error}
                </motion.div>
              )}
              {/* No quote, no payment — the server would refuse the order anyway. */}
              <motion.div className="w-full" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button onClick={handlePlaceOrder} disabled={loading || !quote} className="w-full h-14 text-lg font-bold">
                  {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
                  Pay Advance &amp; Confirm Booking
                </Button>
              </motion.div>
              <p className="text-xs text-muted-foreground text-center">
                You will be redirected to Razorpay for a secure payment.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </main>
  );
};

export default CheckoutPage;