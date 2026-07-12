import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { tourGuideBooking as Booking } from "@/lib/data";

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message =
    error.response?.data?.message || error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

/**
 * What the tourist chooses. Note there is no price here: the backend derives it
 * from the guide's published day rate, so the client cannot name its own price.
 * The advance actually charged comes back on the order.
 */
export interface BookingCreationData {
  guideId: string;
  location: string;
  language: string;
  startDate: string;
  endDate: string;
  numberOfTravelers: number;
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface BookingQuote {
  guideId: string;
  days: number;
  dayRate: number;
  totalPrice: number;
  advance: number;
  balance: number;
}

/** Price a direct booking before committing to it — drives the booking summary. */
export const fetchBookingQuote = createAsyncThunk<
  BookingQuote,
  { guideId: string; startDate: string; endDate: string },
  { rejectValue: string }
>("tourGuideBooking/quote", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await apiService.get<BookingQuote>(`/tourguide/quote?${query}`);
    return response.data as BookingQuote;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

interface CreateOrderResponse {
  id: string;
  amount: number;
  booking_data: string;
  quote: BookingQuote;
  razorpay_options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
  };
}

/**
 * The whole advance-payment journey in one thunk: open the order, run Razorpay,
 * then hand the signature back for verification. The booking only exists once
 * the backend has verified that signature — never before.
 */
export const createAndVerifyBooking = createAsyncThunk<
  Booking,
  BookingCreationData,
  { rejectValue: string }
>("tourGuideBooking/createAndVerify", async (bookingData, { rejectWithValue }) => {
  try {
    const { contactInfo, ...orderInput } = bookingData;

    const orderResponse = await apiService.post<CreateOrderResponse>(
      "/tourguide/create-order",
      orderInput,
    );

    const order = orderResponse.data;
    if (!order?.id) {
      return rejectWithValue("Could not start the payment. Please try again.");
    }

    return await new Promise<Booking>((resolve, reject) => {
      const options = {
        key: order.razorpay_options.key,
        amount: order.razorpay_options.amount,
        currency: order.razorpay_options.currency,
        name: "GetMyGuide",
        description: `Advance payment (₹${order.quote.advance} of ₹${order.quote.totalPrice})`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const result = await apiService.post<Booking>("/tourguide/verify-and-create", {
              // booking_data is the server's own payload echoed straight back; it is
              // what lets the backend re-derive the exact price it quoted.
              booking_data: order.booking_data,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve(result.data as Booking);
          } catch (error: any) {
            reject(
              error.response?.data?.message ||
                "We could not confirm your payment. Do not pay again — contact support with your payment id.",
            );
          }
        },
        prefill: {
          name: contactInfo.fullName,
          email: contactInfo.email,
          contact: contactInfo.phone,
        },
        theme: { color: "#0052d4" },
        modal: {
          ondismiss: () => reject("Payment was cancelled."),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    });
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/** Step 1 of collecting the balance: open the order. */
export const createFinalPaymentOrder = createAsyncThunk<any, string, { rejectValue: string }>(
  "tourGuideBooking/createFinalOrder",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.post<any>(`/tourguide/${bookingId}/create-final-order`);
      return response.data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

/** Step 2: hand the signature back so the backend can settle the balance. */
export const verifyFinalPayment = createAsyncThunk<
  Booking,
  {
    bookingId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  { rejectValue: string }
>("tourGuideBooking/verifyFinalPayment", async (paymentData, { rejectWithValue }) => {
  try {
    const { bookingId, ...verification } = paymentData;
    const response = await apiService.post<Booking>(
      `/tourguide/${bookingId}/verify-final-payment`,
      verification,
    );
    return response.data as Booking;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});
