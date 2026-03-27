"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { AppDispatch, RootState } from '@/lib/store';
import { format } from 'date-fns';
import { Loader2, AlertCircle, Eye, Inbox } from 'lucide-react';

// Import the thunk from its consolidated location
import { fetchMyGuideBookingsThunk } from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';

// Shadcn/UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Helper function to determine badge color based on status
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Upcoming': return 'default';
    case 'Completed': return 'success';
    case 'Cancelled': return 'destructive';
    default: return 'secondary';
  }
};

export default function GuideBookingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  // Select state from the centralized userTourGuideBookings slice
  const { bookings, loading, error } = useSelector((state: RootState) => state.userTourGuideBookings);

  useEffect(() => {
    // Dispatch the correct thunk to get the guide's own bookings
    dispatch(fetchMyGuideBookingsThunk());
  }, [dispatch]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading your bookings...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Fetching Bookings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!bookings || bookings.length === 0) {
      return (
        <div className="text-center py-20 space-y-4">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No bookings found</h3>
          <p className="text-muted-foreground">You have no tours assigned to you at the moment.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tourist</TableHead>
            <TableHead>Tour Dates</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking._id}>
              <TableCell>
                <div className="font-medium">{booking.user?.name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">{booking.user?.email || 'No email'}</div>
              </TableCell>
              <TableCell>
                {format(new Date(booking.startDate), 'LLL dd, yyyy')} - {format(new Date(booking.endDate), 'LLL dd, yyyy')}
              </TableCell>
              <TableCell>{booking.location}</TableCell>
              <TableCell className="text-center">
                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/guide/tourguide-booking/${booking._id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">My Tour Bookings</CardTitle>
          <CardDescription>A list of all tours that have been assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}