// File: lib/redux/thunks/booking/bookingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import {
  Booking,
  CreateRazorpayOrderData,
  UpdateBookingStatusData,
} from "@/lib/data";

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
interface VerifyRemainingPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
}
interface AssignSubstituteData {
  bookingId: string;
  substituteGuideId: string;
}

// Helper function for consistent error handling
const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message = error.message || "An unknown error occurred";
  console.error("Thunk Error:", message, error);
  return rejectWithValue(message);
};

export const createRazorpayOrder = createAsyncThunk(
  "bookings/createRazorpayOrder",
  async (orderData: CreateRazorpayOrderData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/api/bookings/create-order",
        orderData
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to create Razorpay order");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const verifyPaymentAndCreateBooking = createAsyncThunk(
  "bookings/verifyAndCreate",
  async (verificationData: VerifyPaymentData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/api/bookings/verify",
        verificationData
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Payment verification failed");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const createRemainingPaymentOrder = createAsyncThunk(
  "bookings/createRemainingOrder",
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        `/api/bookings/${bookingId}/create-remaining-order`
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || "Failed to create remaining payment order"
      );
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const verifyRemainingPayment = createAsyncThunk(
  "bookings/verifyRemainingPayment",
  async (paymentData: VerifyRemainingPaymentData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        `/api/bookings/${paymentData.bookingId}/verify-remaining-payment`,
        paymentData
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to verify remaining payment");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const fetchMyBookings = createAsyncThunk<Booking[]>(
  "bookings/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Booking[]>(
        "/api/bookings/my-bookings"
      );
      return response.data || [];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// ✅ YEH FUNCTION ADD KIYA GAYA HAI JO MISSING THA
export const fetchAllBookings = createAsyncThunk<Booking[]>(
  "bookings/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      // Assuming you have an admin endpoint to get all bookings
      const response = await apiService.get<Booking[]>("/api/bookings/all");
      return response.data || [];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
// --- YAHAN TAK NAYA CODE HAI ---

export const fetchGuideBookings = createAsyncThunk<Booking[]>(
  "bookings/fetchForGuide",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Booking[]>(
        "/api/bookings/guide-bookings"
      );
      return response.data || [];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const fetchBookingById = createAsyncThunk<Booking, string>(
  "bookings/fetchById",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Booking>(
        `/api/bookings/${bookingId}`
      );
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || "Booking not found");
      }
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const cancelAndRefundBooking = createAsyncThunk<Booking, string>(
  "bookings/cancelBooking",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        `/api/bookings/${bookingId}/cancel`
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to cancel booking");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const updateBookingStatus = createAsyncThunk<
  Booking,
  UpdateBookingStatusData
>(
  "bookings/updateStatus",
  async ({ bookingId, status }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch(
        `/api/bookings/${bookingId}/status`,
        { status }
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to update status");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const assignSubstituteGuide = createAsyncThunk<
  Booking,
  AssignSubstituteData
>(
  "bookings/assignSubstitute",
  async ({ bookingId, substituteGuideId }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch(
        `/api/bookings/${bookingId}/assign-substitute`,
        { substituteGuideId }
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to assign guide");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteBooking = createAsyncThunk<string, string>(
  "bookings/delete",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.delete(`/api/bookings/${bookingId}`);
      if (response.success) {
        return bookingId;
      }
      throw new Error(response.message || "Failed to delete booking");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
