// /app/dashboard/user/tour-guide-booking/[bookingId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import {
  fetchTourGuideBookingById,
  createFinalPaymentOrder,
  verifyFinalPayment,
} from "@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks";
import { Loader2, XCircle, CheckCircle, CreditCard, MapPin, AlertCircle } from "lucide-react";

// This ensures window.Razorpay is recognized by TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function TourGuideBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const bookingId = params.bookingId as string;
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Select state from the correct, consolidated slice
  const { currentUser } = useSelector((state: RootState) => state.user);
  const {
    currentBooking: booking,
    loading,
    error,
  } = useSelector((state: RootState) => state.userTourGuideBookings);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("✅ Razorpay script loaded successfully");
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error("❌ Failed to load Razorpay script");
      toast.error("Failed to load payment gateway. Please refresh the page.");
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script when component unmounts
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchTourGuideBookingById(bookingId));
    }
  }, [dispatch, bookingId]);

  const handleFinalPayment = async () => {
    if (!booking || !currentUser) {
      toast.error("Missing booking or user information");
      return;
    }

    if (!razorpayLoaded) {
      toast.error("Payment gateway is still loading. Please wait a moment.");
      return;
    }

    if (!window.Razorpay) {
      toast.error("Payment gateway not available. Please refresh the page.");
      return;
    }

    const paymentToast = toast.loading("Initializing secure payment...");
    try {
      // Step 1: Create the Razorpay order using our thunk
      console.log("Creating final payment order for booking:", booking._id);
      const order = await dispatch(createFinalPaymentOrder(booking._id)).unwrap();
      
      console.log("✅ Order created successfully:", order);
      toast.dismiss(paymentToast);
      
      // Step 2: Configure Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "BookMyTourGuide",
        description: `Final payment for tour in ${booking.location}`,
        order_id: order.id,
        // Step 3: The handler function is called ONLY on successful payment
        handler: function (response: any) {
          console.log("✅ Payment successful, response:", response);
          const verificationToast = toast.loading("Verifying your payment, please wait...");
          dispatch(
            verifyFinalPayment({
              bookingId: booking._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
          ).unwrap()
           .then(() => {
             toast.success("Payment successful! Your booking is confirmed.", { id: verificationToast });
             // Refresh the booking details
             dispatch(fetchTourGuideBookingById(bookingId));
           })
           .catch((err) => toast.error(err || "Verification failed. Please contact support.", { id: verificationToast }));
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.mobile || "",
        },
        theme: { color: "#D9232D" },
        modal: {
          ondismiss: function() {
            console.log("Payment modal closed by user");
            toast.info("Payment cancelled. You can try again when ready.");
          }
        }
      };

      console.log("Opening Razorpay modal with options:", { ...options, key: "***" });
      
      // Step 4: Create a new Razorpay instance and open the modal
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      console.error("❌ Error in handleFinalPayment:", err);
      toast.error(err || "Could not start payment. Please try again.", { id: paymentToast });
    }
  };

  if (loading && !booking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Could not load booking</h2>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/dashboard/user/tour-guide-booking">
            <button className="mt-6 px-4 py-2 bg-gray-200 rounded">Go Back to Bookings</button>
        </Link>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/user/tour-guide-booking">
          <button className="mb-6 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
              &larr; Back to My Bookings
          </button>
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="flex justify-between items-start gap-4">
              <div>
                  <h1 className="text-3xl font-bold capitalize">{booking.location}</h1>
                  <p className="text-gray-500 flex items-center gap-2 mt-2">
                      <MapPin className="w-4 h-4" /> {booking.location}
                  </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                  booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
              }`}>
                  {booking.status}
              </span>
          </div>

          {/* Booking Details Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
            <div>
              <p className="text-sm text-gray-500">Guide</p>
              <p className="font-semibold">
                {typeof booking.guide === 'object' ? booking.guide.name : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Language</p>
              <p className="font-semibold">{booking.language}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-semibold">{new Date(booking.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-semibold">{new Date(booking.endDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Number of Travelers</p>
              <p className="font-semibold">{booking.numberOfTravelers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Price</p>
              <p className="font-semibold">₹{booking.totalPrice?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Advance Paid</p>
              <p className="font-semibold text-green-600">₹{booking.advanceAmount?.toLocaleString()}</p>
            </div>
            {booking.remainingAmount > 0 && (
              <div>
                <p className="text-sm text-gray-500">Remaining Amount</p>
                <p className="font-semibold text-orange-600">₹{booking.remainingAmount?.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Payment Action Section */}
          <div className="mt-6 border-t pt-6">
            {booking.status === "Upcoming" && booking.paymentStatus === "Advance Paid" && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                    <h3 className="font-bold text-yellow-800">Action Required</h3>
                    <p className="text-yellow-700 text-sm">
                        Please pay the remaining balance of <span className="font-bold">₹{booking.remainingAmount?.toLocaleString()}</span> to confirm your tour.
                    </p>
                    <div className="mt-4">
                        <button 
                          onClick={handleFinalPayment} 
                          disabled={loading || !razorpayLoaded} 
                          className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            {!razorpayLoaded ? "Loading Payment Gateway..." : loading ? "Processing..." : "Pay Remaining Amount"}
                        </button>
                    </div>
                </div>
            )}

            {booking.paymentStatus === "Fully Paid" && (
                  <div className="bg-green-50 border-l-4 border-green-400 text-green-800 p-4 rounded-md flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3" />
                    <div>
                        <h3 className="font-bold">All Set! Your Booking is Confirmed.</h3>
                        <p className="text-sm">Your payment is complete. Enjoy your trip!</p>
                    </div>
                </div>
            )}

            {booking.status === "Cancelled" && (
                  <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-4 rounded-md flex items-center">
                    <XCircle className="h-5 w-5 mr-3" />
                    <div>
                        <h3 className="font-bold">Booking Cancelled</h3>
                        <p className="text-sm">
                          {booking.cancellationReason || "This booking has been cancelled."}
                        </p>
                        {booking.paymentStatus === "Refunded" && (
                          <p className="text-sm mt-1">Your advance payment has been refunded.</p>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}