"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchAllBookings,
  deleteBooking,
  cancelAndRefundBooking,
} from "@/lib/redux/thunks/booking/bookingThunks";
// ✅ PaymentStatus type ko import karein ya define karein
import type { Booking, BookingStatus, PaymentStatus } from "@/lib/data";
import {
  Search,
  Filter,
  Eye,
  Ticket,
  Trash2,
  Undo2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const getStatusVariant = (status: BookingStatus) => {
  switch (status) {
    case "Upcoming":
      return "default";
    case "Completed":
      return "secondary";
    case "Cancelled":
      return "destructive";
    case "Awaiting Substitute":
      return "warning";
    default:
      return "outline";
  }
};

// ✅ NAYA HELPER FUNCTION: Payment status ke liye colors define karne ke liye
// Note: 'success' aur 'warning' variants aapke Badge component mein custom defined hone chahiye.
const getPaymentStatusVariant = (status: PaymentStatus) => {
  switch (status) {
    case "Fully Paid":
      return "success"; // Green color
    case "Advance Paid":
      return "warning"; // Yellow/Orange color
    case "Refunded":
      return "secondary"; // Gray color
    default:
      return "outline";
  }
};

export default function AllBookingsPage() {
  const dispatch = useAppDispatch();
  const { bookings, loading, error } = useAppSelector(
    (state) => state.bookings
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all"
  );

  useEffect(() => {
    dispatch(fetchAllBookings());
  }, [dispatch]);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter(
        (booking) => statusFilter === "all" || booking.status === statusFilter
      )
      .filter((booking) => {
        const searchLower = searchTerm.toLowerCase();
        const tour = typeof booking.tour === "object" ? booking.tour : null;
        const guide = typeof booking.guide === "object" ? booking.guide : null;
        const user = typeof booking.user === "object" ? booking.user : null;

        return (
          tour?.title.toLowerCase().includes(searchLower) ||
          guide?.name.toLowerCase().includes(searchLower) ||
          user?.name.toLowerCase().includes(searchLower) ||
          booking._id.toLowerCase().includes(searchLower)
        );
      });
  }, [bookings, searchTerm, statusFilter]);

  const handleCancel = (bookingId: string, tourTitle: string) => {
    if (
      confirm(
        `Are you sure you want to cancel the booking for "${tourTitle}"? The advance amount will be refunded.`
      )
    ) {
      dispatch(cancelAndRefundBooking(bookingId))
        .unwrap()
        .then(() =>
          toast.success("Booking cancelled and refund initiated successfully!")
        )
        .catch((err) =>
          toast.error(err || "Failed to cancel and refund booking.")
        );
    }
  };

  const handleDelete = (bookingId: string, tourTitle: string) => {
    if (
      confirm(`Are you sure you want to delete the booking for "${tourTitle}"?`)
    ) {
      dispatch(deleteBooking(bookingId))
        .unwrap()
        .then(() => toast.success("Booking deleted successfully!"))
        .catch((err) => toast.error(err || "Failed to delete booking."));
    }
  };

  const renderContent = () => {
    if (loading && bookings.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-xl font-semibold">Error loading bookings</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Tour Package
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Customer</TableHead>
                  <TableHead className="whitespace-nowrap">Guide</TableHead>
                  <TableHead className="whitespace-nowrap">Dates</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Total Price
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    Booking Status
                  </TableHead>
                  {/* ✅ NAYA COLUMN HEADER */}
                  <TableHead className="whitespace-nowrap">
                    Payment Status
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    const tour =
                      typeof booking.tour === "object" ? booking.tour : null;
                    const guide =
                      typeof booking.guide === "object" ? booking.guide : null;
                    const user =
                      typeof booking.user === "object" ? booking.user : null;
                    return (
                      <TableRow key={booking._id} className="hover:bg-muted/50">
                        <TableCell>
                          <div
                            className="flex items-center gap-3"
                            style={{ minWidth: "250px" }}
                          >
                            <img
                              src={tour?.images?.[0] || "/placeholder.png"}
                              alt={tour?.title || "Tour"}
                              className="w-14 h-14 object-cover rounded-md flex-shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-foreground truncate max-w-[200px]">
                                {tour?.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {booking._id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{user?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user?.email}
                          </div>
                        </TableCell>
                        <TableCell>{guide?.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(booking.startDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            to {new Date(booking.endDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{booking.totalPrice.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        {/* ✅ NAYI CELL PAYMENT STATUS KE LIYE */}
                        <TableCell>
                          {booking.paymentStatus && (
                            <Badge
                              variant={getPaymentStatusVariant(
                                booking.paymentStatus
                              )}
                            >
                              {booking.paymentStatus}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/dashboard/admin/service-bookings/${booking._id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" /> View
                              </Link>
                            </Button>
                            {booking.status === "Upcoming" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleCancel(
                                    booking._id,
                                    tour?.title || "this tour"
                                  )
                                }
                              >
                                <Undo2 className="w-4 h-4 mr-1" /> Cancel &
                                Refund
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete(
                                  booking._id,
                                  tour?.title || "this tour"
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    {/* ✅ COLSPAN KO 8 KARNA ZARURI HAI */}
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Ticket className="w-8 h-8 text-muted-foreground" />
                        <p>No bookings match your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">All Bookings</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all customer bookings.
          </p>
        </div>
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by tour, guide, user, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 rounded-md border bg-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </CardHeader>
        </Card>
        {renderContent()}
      </div>
    </div>
  );
}