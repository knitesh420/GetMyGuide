"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation"; // useRouter import karein
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchCustomTourRequestById } from "@/lib/redux/thunks/customTour/customTourThunks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  User,
  MapPin,
  Calendar,
  Languages,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  ArrowLeft, // Back icon import karein
} from "lucide-react";

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

const PaymentCard = ({ request }: { request: any }) => {
  const { status, quoteAmount } = request;

  if (status === "Pending") {
    return (
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Awaiting Quote</AlertTitle>
        <AlertDescription>
          Our team is reviewing your request and will provide a quote shortly.
        </AlertDescription>
      </Alert>
    );
  }

  // ✅ FIX: Pay button ko "Quoted" status ke liye alag se handle karein
  // if (status === "Quoted" && quoteAmount > 0) {
  //   const advanceAmount = quoteAmount * 0.2; // 20% advance
  //   return (
  //     <div className="space-y-4 text-center">
  //       <p>
  //         To confirm your booking, please pay a 20% advance of{" "}
  //         <span className="font-bold text-lg">
  //           ₹{advanceAmount.toLocaleString()}
  //         </span>
  //         .
  //       </p>
  //       <Button size="lg" className="w-full font-bold">
  //         <CreditCard className="w-5 h-5 mr-2" /> Pay Advance Now
  //       </Button>
  //     </div>
  //   );
  // }

  if (status === "Booked") {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-700" />
        <AlertTitle className="text-green-800">Booking Confirmed!</AlertTitle>
        <AlertDescription className="text-green-700">
          Your tour is booked. We will contact you with the final itinerary.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
};

export default function CustomRequestUserDetailPage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const router = useRouter(); // router ko initialize karein
  const requestId = params.requestId as string;

  const {
    currentRequest: request,
    detailLoading,
    detailError,
  } = useAppSelector((state) => state.customTour);

  useEffect(() => {
    if (requestId) {
      dispatch(fetchCustomTourRequestById(requestId));
    }
  }, [dispatch, requestId]);

  if (detailLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  if (detailError)
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Could Not Load Request</h2>
        <p className="text-muted-foreground">{detailError}</p>
      </div>
    );
  if (!request)
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-bold">Request Not Found</h2>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted/50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ✅ FIX: Back button yahan add kiya gaya hai */}
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Requests
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Your Custom Request</CardTitle>
                <CardDescription>Request ID: {request._id}</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                <DetailItem
                  icon={MapPin}
                  label="Destinations"
                  value={
                    request.selectedLocations
                      ?.map((loc: any) => loc.placeName)
                      .join(", ") || "N/A"
                  }
                />
                <DetailItem
                  icon={Calendar}
                  label="Dates"
                  value={
                    request.dateRange?.from
                      ? `${new Date(
                          request.dateRange.from
                        ).toLocaleDateString()} - ${new Date(
                          request.dateRange.to
                        ).toLocaleDateString()}`
                      : "Flexible"
                  }
                />
                <DetailItem icon={User} label="Travelers" value={request.numTravelers} />
                <DetailItem
                  icon={Languages}
                  label="Language"
                  value={request.selectedLanguage?.languageName || "N/A"}
                />
              </CardContent>
            </Card>

            {request.status !== "Pending" && request.adminComment && (
              <Card>
                <CardHeader>
                  <CardTitle>A Note From Our Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <p className="text-muted-foreground italic">
                      "{request.adminComment}"
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="sticky top-24">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Booking Status</CardTitle>
                <div className="flex justify-center pt-2">
                  <Badge variant={getStatusVariant(request.status)} className="px-4 py-1 text-base">
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {request.quoteAmount > 0 && (
                  <>
                    <div className="flex justify-between items-baseline mb-4">
                      <p className="text-lg text-muted-foreground">
                        Total Quote
                      </p>
                      <p className="text-4xl font-extrabold text-primary">
                        ₹{request.quoteAmount.toLocaleString()}
                      </p>
                    </div>
                    <Separator className="my-6" />
                  </>
                )}
                <PaymentCard request={request} />
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
    <div className="flex gap-3">
        <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
        </div>
    </div>
);