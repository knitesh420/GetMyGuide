// app/dashboard/guide/upcoming-tours/page.tsx
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { bookings as initialBookings, tours, guides } from '@/lib/data';
import type { Booking, Tour, Guide, BookingStatus } from '@/lib/data';
import { toast } from 'react-toastify';
import { 
  Search, 
  Eye,
  XCircle,
  Calendar,
  MapPin,
  User as UserIcon,
  Clock,
  IndianRupee,
  CheckCircle,
  Mail
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

// --- TOUR DETAIL SHEET COMPONENT (Reused from the previous page) ---
function TourDetailSheet({ 
    booking, 
    tour, 
    guide, 
    isOpen, 
    onOpenChange 
}: { 
    booking: Booking; 
    tour: Tour; 
    guide: Guide; 
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void;
}) {
    const advancePaid = booking.totalPrice * 0.20;
    const remainingAmount = booking.totalPrice * 0.80;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-4xl sm:max-w-4xl flex flex-col p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-2xl">Upcoming Trip Details</SheetTitle>
                    <SheetDescription>Viewing booking ID: {booking._id}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- LEFT (MAIN DETAILS) --- */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>{tour.title}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <img src={tour.images[0]} alt={tour.title} className="w-full h-48 object-cover rounded-lg"/>
                                <div className="flex items-center gap-3 text-muted-foreground"><Calendar className="w-4 h-4 text-primary"/><span>{new Date(booking.startDate).toDateString()} to {new Date(booking.endDate).toDateString()}</span></div>
                                <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="w-4 h-4 text-primary"/><span>{tour.locations.join(', ')}</span></div>
                                <div className="flex items-center gap-3 text-muted-foreground"><Clock className="w-4 h-4 text-primary"/><span>{tour.duration}</span></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3"><UserIcon className="w-4 h-4 text-primary"/><span>{booking.userName}</span></div>
                                <div className="flex items-center gap-3 text-muted-foreground"><Mail className="w-4 h-4 text-primary"/><span>{booking.userEmail}</span></div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* --- RIGHT (PAYMENT & GUIDE) --- */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Payment Status</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total Package Price</span>
                                    <span className="font-semibold">₹{booking.totalPrice.toLocaleString()}</span>
                                </div>
                                {booking.advancePaid && (
                                    <div className="flex justify-between items-center text-sm text-green-600">
                                        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4"/>Advance Paid (20%)</span>
                                        <span className="font-semibold">- ₹{advancePaid.toLocaleString()}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>Remaining Balance</span>
                                    <span className="text-primary">₹{remainingAmount.toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Your Role</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-3">
                                <img src={guide.photo} alt={guide.name} className="w-12 h-12 rounded-full object-cover"/>
                                <div>
                                    <p className="font-semibold">{guide.name}</p>
                                    <p className="text-sm text-muted-foreground">Assigned Main Guide</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <SheetFooter className="p-6 border-t bg-muted/50">
                    <SheetClose asChild><Button variant="outline">Close</Button></SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}


// --- MAIN PAGE COMPONENT ---
export default function GuideUpcomingToursPage() {
  const loggedInGuideId = "guide_prof_02"; // Mock: Assuming Anjali Sharma is logged in

  const [allBookings, setAllBookings] = useState<Booking[]>(initialBookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const populatedBookings = useMemo(() => {
    return allBookings
      .filter(b => b.guideId === loggedInGuideId)
      // --- KEY CHANGE: Only include "Upcoming" tours ---
      .filter(b => b.status === 'Upcoming')
      .map(booking => {
        const tour = tours.find(t => t._id === booking.tourId);
        const guide = guides.find(g => g.guideProfileId === booking.guideId);
        return { ...booking, tour, guide };
      })
      .filter(item => item.tour && item.guide);
  }, [allBookings]);

  const filteredBookings = useMemo(() => {
    return populatedBookings
      .filter(b => {
        const searchLower = searchTerm.toLowerCase();
        return (
          b.tour!.title.toLowerCase().includes(searchLower) ||
          b.userName?.toLowerCase().includes(searchLower)
        );
      });
  }, [populatedBookings, searchTerm]);
  
  const handleCancel = (bookingId: string) => {
    if (confirm("Are you sure you want to cancel this trip? The user will be notified.")) {
        setAllBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'Cancelled' } : b));
        toast.success("Trip has been successfully cancelled.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-10">
        <section className="py-10 bg-card border-b">
          <div className="container max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-extrabold">My Upcoming Tours</h1>
            <p className="mt-2 text-lg text-muted-foreground">Here is a list of your confirmed, upcoming tour assignments.</p>
          </div>
        </section>

        <section className="py-8">
          <div className="container max-w-7xl mx-auto px-4">
            <Card className="mb-8">
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input type="text" placeholder="Search by tour or customer name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-6">
              {filteredBookings.length > 0 ? filteredBookings.map(item => (
                <Card key={item._id} className="overflow-hidden">
                  <div className="p-6 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                      <img src={item.tour!.images[0]} alt={item.tour!.title} className="w-24 h-24 object-cover rounded-lg" />
                      <div>
                        <Badge variant="default">{item.status}</Badge>
                        <h3 className="font-bold text-xl mt-1">{item.tour!.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Customer: <span className="font-medium text-foreground">{item.userName}</span></p>
                        <p className="text-sm text-muted-foreground">Dates: {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button variant="outline" onClick={() => setSelectedBooking(item)}>
                        <Eye className="w-4 h-4 mr-2"/> View Details
                      </Button>
                      <Button variant="destructive" onClick={() => handleCancel(item._id)}>
                        <XCircle className="w-4 h-4 mr-2"/> Cancel Trip
                      </Button>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-24 bg-card rounded-lg border">
                  <h2 className="text-2xl font-bold">No Upcoming Tours</h2>
                  <p className="text-muted-foreground">You have no assignments scheduled. Check back later!</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {selectedBooking && (
        <TourDetailSheet
            isOpen={!!selectedBooking}
            onOpenChange={(isOpen) => !isOpen && setSelectedBooking(null)}
            booking={selectedBooking}
            tour={selectedBooking.tour!}
            guide={selectedBooking.guide!}
        />
      )}
    </div>
  );
}