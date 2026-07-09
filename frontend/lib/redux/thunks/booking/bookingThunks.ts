// File: lib/redux/thunks/booking/bookingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminBookingSummary, CreateRazorpayOrderData } from "@/lib/data";

// Interfaces
interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  tourId: string;
  guideId: string;
  startDate: string;
  endDate: string;
  numberOfTourists: number;
}

// Helper function for consistent error handling
const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message = error.message || "An unknown error occurred";
  console.error("Thunk Error:", message, error);
  return rejectWithValue(message);
};

type BookingEnvelope = { bookings: AdminBookingSummary[] };

const unwrapBookings = (
  data: BookingEnvelope | AdminBookingSummary[] | undefined,
) => {
  if (Array.isArray(data)) return data;
  return data?.bookings || [];
};

export const createRazorpayOrder = createAsyncThunk(
  "bookings/createRazorpayOrder",
  async (orderData: CreateRazorpayOrderData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/booking/customised-booking",
        orderData,
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to create Razorpay order");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const verifyPaymentAndCreateBooking = createAsyncThunk<
  AdminBookingSummary,
  VerifyPaymentData
>(
  "bookings/verifyAndCreate",
  async (verificationData: VerifyPaymentData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/booking/verify-booking",
        verificationData,
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Payment verification failed");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const fetchMyBookings = createAsyncThunk<AdminBookingSummary[]>(
  "bookings/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<BookingEnvelope>(
        "/booking/my-bookings",
      );
      return unwrapBookings(response.data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// ✅ YEH FUNCTION ADD KIYA GAYA HAI JO MISSING THA
export const fetchAllBookings = createAsyncThunk<AdminBookingSummary[]>(
  "bookings/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<BookingEnvelope>("/booking");
      return unwrapBookings(response.data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
// --- YAHAN TAK NAYA CODE HAI ---

export const fetchGuideBookings = createAsyncThunk<AdminBookingSummary[]>(
  "bookings/fetchForGuide",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<BookingEnvelope>(
        "/booking/my-reservations",
      );
      return unwrapBookings(response.data);
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const fetchBookingById = createAsyncThunk<AdminBookingSummary, string>(
  "bookings/fetchById",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminBookingSummary>(
        `/booking/${bookingId}`,
      );
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || "Booking not found");
      }
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const deleteBooking = createAsyncThunk<string, string>(
  "bookings/delete",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.delete(`/booking/${bookingId}`);
      if (response.success) {
        return bookingId;
      }
      throw new Error(response.message || "Failed to delete booking");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
