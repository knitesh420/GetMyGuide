// File: components/AdminBookingDetailPage.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchBookingById,
  updateBookingStatus,
  assignSubstituteGuide,
} from "@/lib/redux/thunks/booking/bookingThunks";
import { getAllGuides } from "@/lib/redux/thunks/guide/guideThunk";
import type { Booking, Guide, BookingStatus,PaymentStatus  } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  Edit,
  Users,
  Info,
  UserX,
  Shield
} from "lucide-react";

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

const GuideInfoCard = ({ guide, title }: { guide: Guide; title: string }) => (
  <CardContent className="space-y-2 pt-4">
    <p className="text-sm font-semibold text-muted-foreground">{title}</p>
    <div className="flex items-center gap-3">
      <Image
        src={guide.photo || "/placeholder.png"}
        alt={guide.name}
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div>
        <p className="font-semibold">{guide.name}</p>
        <p className="text-xs text-muted-foreground">{guide.email}</p>
      </div>
    </div>
  </CardContent>
);

export default function AdminBookingDetailPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { bookingId } = params;

  const {
    currentBooking: booking,
    loading: bookingLoading,
    error: bookingError,
  } = useAppSelector((state) => state.bookings);
  const { guides, loading: guidesLoading } = useAppSelector(
    (state) => state.guide
  );

  const [newStatus, setNewStatus] = useState<BookingStatus | "">("");
  const [selectedSubGuide, setSelectedSubGuide] = useState<string>("");

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingById(bookingId as string));
      dispatch(getAllGuides());
    }
  }, [dispatch, bookingId]);

  useEffect(() => {
    if (booking) {
      setNewStatus(booking.status);
    }
  }, [booking]);

  const handleStatusUpdate = () => {
    if (!newStatus || newStatus === booking?.status) return;
    dispatch(
      updateBookingStatus({
        bookingId: bookingId as string,
        status: newStatus,
      })
    )
      .unwrap()
      .then(() => toast.success("Booking status updated successfully!"))
      .catch((err) => toast.error(err || "Failed to update status."));
  };

  const handleAssignSubstitute = () => {
    if (!selectedSubGuide) {
      toast.error("Please select a guide to assign.");
      return;
    }
    dispatch(
      assignSubstituteGuide({
        bookingId: bookingId as string,
        substituteGuideId: selectedSubGuide,
      })
    )
      .unwrap()
      .then(() => {
        toast.success("Substitute guide assigned successfully!");
        setSelectedSubGuide("");
      })
      .catch((err) => toast.error(err || "Failed to assign guide."));
  };

  const availableGuides = useMemo(() => {
    if (!guides || !booking?.guide) return [];
    // Ensure booking.guide has an _id before filtering
    const currentGuideId =
      typeof booking.guide === "object" ? booking.guide._id : null;
    if (!currentGuideId) return guides;
    return guides.filter((g) => g._id !== currentGuideId);
  }, [guides, booking]);

  if (bookingLoading || guidesLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingError) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{bookingError}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Booking not found.</h2>
      </div>
    );
  }

  const tour = typeof booking.tour === "object" ? booking.tour : null;
  const user = typeof booking.user === "object" ? booking.user : null;
  const guide = typeof booking.guide === "object" ? booking.guide : null;
  const originalGuide =
    typeof booking.originalGuide === "object" ? booking.originalGuide : null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to All Bookings
      </Button>
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-3xl md:text-4xl font-extrabold">{tour?.title}</h1>
        <Badge
          variant={getStatusVariant(booking.status)}
          className="text-md px-4 py-2"
        >
          {booking.status}
        </Badge>
      </div>
      <p className="text-muted-foreground mb-8">Booking ID: {booking._id}</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
        {booking.status === "Cancelled" && booking.cancelledBy && (
            <Card className="border-destructive bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Cancellation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <UserX className="w-5 h-5 text-destructive" />
                  <div>
                    <span className="text-sm">Cancelled By:</span>
                    <p className="font-bold">
                      {booking.cancelledBy.cancellerName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-destructive" />
                  <div>
                    <span className="text-sm">Role:</span>
                    <p className="font-semibold capitalize">
                      {booking.cancelledBy.cancellerRole}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {["Upcoming", "Awaiting Substitute"].includes(booking.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Assign Substitute Guide</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Select
                  value={selectedSubGuide}
                  onValueChange={setSelectedSubGuide}
                >
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select a new guide" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGuides.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignSubstitute}
                  disabled={!selectedSubGuide || bookingLoading}
                >
                  <Users className="w-4 h-4 mr-2" /> Assign
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Update Booking Status</CardTitle>
              {/* ✅ NAYA CODE: Agar status cancelled hai toh message dikhayein */}
              {booking.status === "Cancelled" && (
                <CardDescription className="pt-2 text-destructive">
                  This booking is cancelled and its status cannot be changed.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Select
                value={newStatus}
                onValueChange={(value) => setNewStatus(value as BookingStatus)}
                // ✅ NAYA CODE: Status cancelled hone par select ko disable karein
                disabled={booking.status === "Cancelled"}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Awaiting Substitute">
                    Awaiting Substitute
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                // ✅ NAYA CODE: Button ko bhi disable karein agar status cancelled hai
                disabled={
                  newStatus === booking.status ||
                  bookingLoading ||
                  booking.status === "Cancelled"
                }
              >
                <Edit className="w-4 h-4 mr-2" /> Update Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span>
                  {new Date(booking.startDate).toLocaleDateString()} to{" "}
                  {new Date(booking.endDate).toLocaleDateString()}
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <span>{booking.numberOfTourists} Tourists</span>
              </p>
              <p className="flex items-center gap-3 font-bold">
                <span className="text-primary">Total Price:</span>
                <span>₹{booking.totalPrice.toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-primary" />{" "}
                <span className="font-bold">{user?.name}</span>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" /> {user?.email}
              </p>
              {user?.mobile && (
                <p className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" /> {user.mobile}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guide Details</CardTitle>
            </CardHeader>
            {guide && (
              <GuideInfoCard
                guide={guide}
                title={
                  originalGuide
                    ? "Substitute Guide (Current)"
                    : "Assigned Guide"
                }
              />
            )}
            {originalGuide && <div className="mx-6 my-2 border-t"></div>}
            {originalGuide && (
              <GuideInfoCard guide={originalGuide} title="Original Guide" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}