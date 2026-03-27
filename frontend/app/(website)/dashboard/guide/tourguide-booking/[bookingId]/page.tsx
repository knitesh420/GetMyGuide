"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import { AppDispatch, RootState } from '@/lib/store';
import { format } from 'date-fns';
import { Loader2, AlertCircle, ChevronLeft, User, Calendar, MapPin, IndianRupee , Languages } from 'lucide-react';

// Import thunks and actions from their consolidated location
import { fetchMyGuideBookingByIdThunk } from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';
import { clearCurrentBooking } from '@/lib/redux/userTourGuideBookingSlice';

// Shadcn/UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'default';
      case 'Completed': return 'success';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
};

export default function GuideBookingDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { bookingId } = useParams();
  
  // Select the specific 'currentBooking' state for this page
  const { currentBooking: booking, loading, error } = useSelector((state: RootState) => state.userTourGuideBookings);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchMyGuideBookingByIdThunk(bookingId as string));
    }
    // IMPORTANT: Cleanup function to clear the booking from state when the component unmounts
    return () => {
      dispatch(clearCurrentBooking());
    };
  }, [dispatch, bookingId]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
        <div className="container mx-auto py-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="link" onClick={() => router.back()} className="mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
        </div>
    );
  }

  if (!booking) {
    // This state occurs briefly before loading or if the booking is not found
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back to All Bookings
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Booking Details</CardTitle>
              <CardDescription className='mt-1'>Review the information for the tour in <strong>{booking.location}</strong>.</CardDescription>
            </div>
            <Badge variant={getStatusVariant(booking.status)} className="text-base w-fit">{booking.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center text-lg"><User className="w-5 h-5 mr-3 text-primary" />Tourist Information</h3>
              <p><strong>Name:</strong> {booking.user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {booking.user?.email || 'No email'}</p>
              <p><strong>Contact Name (on form):</strong> {booking.contactInfo.fullName}</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center text-lg"><Calendar className="w-5 h-5 mr-3 text-primary" />Tour Dates</h3>
              <p><strong>Start Date:</strong> {format(new Date(booking.startDate), 'PPP')}</p>
              <p><strong>End Date:</strong> {format(new Date(booking.endDate), 'PPP')}</p>
            </div>
          </div>
          <Separator />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-lg"><MapPin className="w-5 h-5 mr-3 text-primary" />Location & Language</h3>
                <p><strong>Location:</strong> {booking.location}</p>
                <p><strong>Language Requested:</strong> {booking.language}</p>
              </div>
               <div className="space-y-4">
                <h3 className="font-semibold flex items-center text-lg"><IndianRupee  className="w-5 h-5 mr-3 text-primary" />Payment Details</h3>
                <p><strong>Total Price:</strong> ₹{booking.totalPrice.toLocaleString()}</p>
                <p><strong>Payment Status:</strong> <Badge variant="outline">{booking.paymentStatus}</Badge></p>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}