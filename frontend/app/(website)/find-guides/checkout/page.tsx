"use client";

import { FC, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store';
import { createAndVerifyBooking, BookingCreationData } from '@/lib/redux/thunks/tourGuideBooking/tourGuideBookingThunk';
import { clearBookingState } from '@/lib/redux/tourGuideBookingSlice';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const CheckoutPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch: AppDispatch = useDispatch();

  const { loading, error } = useSelector((state: RootState) => state.tourGuideBooking);

  // --- State for the form ---
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // --- Extract data from URL ---
  const bookingDetails = useMemo(() => ({
    guideId: searchParams.get('guideId')!,
    guideName: searchParams.get('guideName')!,
    location: searchParams.get('location')!,
    language: searchParams.get('language')!,
    startDate: new Date(searchParams.get('startDate')!),
    endDate: new Date(searchParams.get('endDate')!),
    numTravelers: parseInt(searchParams.get('numTravelers') || '1', 10),
    totalPrice: parseFloat(searchParams.get('totalPrice') || '0'),
    guidePhoto: searchParams.get('guidePhoto')!,
  }), [searchParams]);

  const advanceAmount = Math.round(bookingDetails.totalPrice * 0.20);

  // --- Load Razorpay script dynamically ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    // Clear any previous booking state when component mounts
    dispatch(clearBookingState());
  }, [dispatch]);

  const handlePlaceOrder = async () => {
    if (!fullName || !email || !phone) {
      alert('Please fill in all contact details.');
      return;
    }

    const bookingData: BookingCreationData = {
      guideId: bookingDetails.guideId,
      location: bookingDetails.location,
      language: bookingDetails.language,
      startDate: bookingDetails.startDate.toISOString(),
      endDate: bookingDetails.endDate.toISOString(),
      numberOfTravelers: bookingDetails.numTravelers,
      totalPrice: bookingDetails.totalPrice,
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black py-16 md:py-24">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Confirm Your Booking</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8 lg:gap-12 p-8">
            {/* Left Side: Booking Summary */}
            <div className="space-y-6">
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
                <div className="flex justify-between"><span>Total Price:</span> <span>₹{bookingDetails.totalPrice.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Advance Payable (20%):</span>
                  <span className="text-primary">₹{advanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Contact Form */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Contact Information</h3>
              <div className="space-y-4">
                <div><Label htmlFor="fullName">Full Name</Label><Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your name" /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 12345 67890" /></div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-8 bg-gray-50 dark:bg-gray-900/50">
            {error && (
              <div className="text-destructive text-center p-3 bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> {error}
              </div>
            )}
            <Button onClick={handlePlaceOrder} disabled={loading} className="w-full h-14 text-lg font-bold">
              {loading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
              Pay Advance & Confirm Booking
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You will be redirected to Razorpay for a secure payment.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
};

export default CheckoutPage;