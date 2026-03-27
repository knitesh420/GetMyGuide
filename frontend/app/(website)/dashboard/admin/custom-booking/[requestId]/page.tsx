"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  fetchCustomTourRequestById,
  updateCustomTourRequestStatus,
} from "@/lib/redux/thunks/customTour/customTourThunks";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Calendar,
  Languages,
  Send,
  Loader2,
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Users,
  Utensils,
  Hotel,
  FileText,
  IndianRupee,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusOptions = ["Pending", "Quoted", "Booked", "Rejected"];

// Status ke liye alag-alag colors define karne wala helper function
const getStatusVariant = (status: string) => {
  switch (status) {
    case "Pending":
      return "destructive";
    case "Quoted":
      return "default";
    case "Booked":
      return "secondary";
    case "Rejected":
      return "outline";
    default:
      return "outline";
  }
};

export default function CustomRequestDetailPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const { currentRequest, detailLoading, detailError } = useAppSelector(
    (state) => state.customTour
  );

  // Local state for managing form inputs
  const [newStatus, setNewStatus] = useState("");
  const [quoteAmount, setQuoteAmount] = useState<number | string>("");
  const [adminComment, setAdminComment] = useState("");

  // Request data fetch karne ke liye
  useEffect(() => {
    if (requestId) {
      dispatch(fetchCustomTourRequestById(requestId));
    }
  }, [dispatch, requestId]);

  // Redux store se data aane par local state ko update karna
  useEffect(() => {
    if (currentRequest) {
      setNewStatus(currentRequest.status);
      setQuoteAmount(currentRequest.quoteAmount || "");
      setAdminComment(currentRequest.adminComment || "");
    }
  }, [currentRequest]);

  // Status update handle karne wala function
  const handleStatusUpdate = () => {
    const payload: {
      requestId: string;
      status: string;
      quoteAmount?: number;
      adminComment?: string;
    } = { requestId, status: newStatus };

    // Agar status 'Quoted' hai, to amount validate karein aur payload mein add karein
    if (newStatus === "Quoted") {
      if (!quoteAmount || +quoteAmount <= 0) {
        toast.error("Please enter a valid quote amount.");
        return;
      }
      payload.quoteAmount = +quoteAmount;
      payload.adminComment = adminComment;
    }

    dispatch(updateCustomTourRequestStatus(payload))
      .unwrap()
      .then(() => toast.success(`Status updated to ${newStatus}`))
      .catch((err) => toast.error(err.message || "Failed to update status."));
  };

  // Loading state
  if (detailLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // Error state
  if (detailError) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Error Loading Request</h2>
        <p>{detailError}</p>
      </div>
    );
  }

  // Agar request nahi milti
  if (!currentRequest) {
    return (
        <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold">Request Not Found</h2>
            <p>The request you are looking for does not exist.</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Requests
        </Button>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inquiry Details</CardTitle>
                <CardDescription>
                  Request ID: {currentRequest._id}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <DetailItem
                  icon={MapPin}
                  label="Destinations"
                  value={
                    currentRequest.selectedLocations
                      ?.map((loc: any) => loc.placeName)
                      .join(", ") || "N/A"
                  }
                />
                <DetailItem
                  icon={Calendar}
                  label="Dates"
                  value={
                    currentRequest.dateRange?.from
                      ? `${new Date(
                          currentRequest.dateRange.from
                        ).toLocaleDateString()} - ${new Date(
                          currentRequest.dateRange.to
                        ).toLocaleDateString()}`
                      : "Flexible"
                  }
                />
                <DetailItem
                  icon={Users}
                  label="Travelers"
                  value={currentRequest.numTravelers}
                />
                <DetailItem
                  icon={Languages}
                  label="Language"
                  value={currentRequest.selectedLanguage?.languageName || "N/A"}
                />
              </CardContent>
            </Card>

            {/* Quote Details Card - Sirf tab dikhega jab status Quoted, Booked ya Rejected ho */}
            {(currentRequest.status === "Quoted" || currentRequest.status === "Booked" || currentRequest.status === "Rejected") && currentRequest.quoteAmount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quote Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailItem
                    icon={IndianRupee}
                    label="Quoted Amount"
                    value={`₹${currentRequest.quoteAmount.toLocaleString()}`}
                  />
                  {currentRequest.adminComment && (
                    <DetailItem
                      icon={MessageSquare}
                      label="Admin Comment"
                      value={currentRequest.adminComment}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 <p><strong>Name:</strong> {currentRequest.fullName}</p>
                 <p><strong>Email:</strong> {currentRequest.email}</p>
                 <p><strong>Phone:</strong> {currentRequest.phone || "Not provided"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem
                  icon={FileText}
                  label="Preferred Monuments"
                  value={currentRequest.preferredMonuments || "None specified"}
                />
                <div>
                  <p className="font-semibold mb-2">Requested Services</p>
                  <div className="flex flex-wrap gap-2">
                    <ServiceBadge icon={Hotel} active={currentRequest.needsStay} label="Stay" />
                    <ServiceBadge icon={Utensils} active={currentRequest.needsLunch} label="Lunch" />
                    <ServiceBadge icon={Utensils} active={currentRequest.needsDinner} label="Dinner" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Status</Label>
                  <p>
                    <Badge variant={getStatusVariant(currentRequest.status)}>
                      {currentRequest.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional fields for "Quoted" status */}
                {newStatus === "Quoted" && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">ADD QUOTE DETAILS</h3>
                    <div>
                      <Label htmlFor="quoteAmount">Quote Amount (₹)</Label>
                      <Input
                        id="quoteAmount"
                        type="number"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="e.g., 50000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="adminComment">Admin Comment (Optional)</Label>
                      <Textarea
                        id="adminComment"
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        placeholder="Add a comment for the user..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <Button className="w-full" onClick={handleStatusUpdate} disabled={detailLoading}>
                  <Send className="mr-2 h-4 w-4" /> Save Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable component for displaying details
const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
    <div>
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  </div>
);

// Reusable component for service badges
const ServiceBadge = ({ icon: Icon, active, label }: { icon: React.ElementType, active: boolean, label: string }) => (
    <Badge variant={active ? "default" : "outline"} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
    </Badge>
);