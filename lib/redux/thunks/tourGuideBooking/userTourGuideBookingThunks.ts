// lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { tourGuideBooking as Booking } from "@/lib/data";

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message =
    error.response?.data?.message || error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

interface FetchParams {
  page: number;
  limit: number;
}

interface FetchResponse {
  data: Booking[];
  pagination: {
    page: number;
    totalPages: number;
    totalBookings: number;
  };
}

/** A cancellation request awaiting an admin decision. Not a cancelled booking. */
export interface RefundRequest {
  _id: string;
  refundCode: string | null;
  booking: string;
  reason: string;
  status: "pending" | "processed" | "rejected" | "failed";
  amountPaid: number;
  approvedAmount?: number;
  adminNote?: string;
  createdAt: string;
}

export const fetchUserBookings = createAsyncThunk<
  FetchResponse,
  FetchParams,
  { rejectValue: string }
>("userBookings/fetch", async ({ page, limit }, { rejectWithValue }) => {
  try {
    const response = await apiService.get<FetchResponse>(
      `/tourguide/user-bookings?page=${page}&limit=${limit}`,
    );
    return response.data as FetchResponse;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/**
 * Ask to cancel. This does NOT cancel the booking — it opens a request an admin
 * reviews and decides the refund on. The booking stays live until they do, so
 * the UI must not optimistically strike it through.
 */
export const cancelBooking = createAsyncThunk<
  RefundRequest,
  { bookingId: string; reason: string },
  { rejectValue: string }
>("userBookings/cancel", async ({ bookingId, reason }, { rejectWithValue }) => {
  try {
    const response = await apiService.post<RefundRequest>(`/tourguide/${bookingId}/cancel`, {
      reason,
    });
    return response.data as RefundRequest;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchAllBookingsAdmin = createAsyncThunk<
  FetchResponse,
  FetchParams,
  { rejectValue: string }
>("userBookings/fetchAllAdmin", async ({ page, limit }, { rejectWithValue }) => {
  try {
    const response = await apiService.get<FetchResponse>(
      `/tourguide/all?page=${page}&limit=${limit}`,
    );
    return response.data as FetchResponse;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/**
 * An admin cancelling goes through the same request queue as everyone else, so
 * that the refund amount is always set explicitly in one place rather than being
 * implied by whoever happened to click cancel.
 */
export const cancelBookingByAdmin = createAsyncThunk<
  RefundRequest,
  { bookingId: string; reason: string },
  { rejectValue: string }
>("userBookings/cancelByAdmin", async ({ bookingId, reason }, { rejectWithValue }) => {
  try {
    const response = await apiService.post<RefundRequest>(`/tourguide/${bookingId}/cancel`, {
      reason,
    });
    return response.data as RefundRequest;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const reassignGuideThunk = createAsyncThunk<
  Booking,
  { bookingId: string; newGuideId: string },
  { rejectValue: string }
>("userBookings/reassignGuide", async ({ bookingId, newGuideId }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<Booking>(`/tourguide/${bookingId}/reassign-guide`, {
      newGuideId,
    });
    return response.data as Booking;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const updateBookingStatusThunk = createAsyncThunk<
  Booking,
  { bookingId: string; status: "Upcoming" | "Completed" },
  { rejectValue: string }
>("userBookings/updateStatus", async ({ bookingId, status }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<Booking>(`/tourguide/${bookingId}/status`, { status });
    return response.data as Booking;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

/** Every booking allocated to the calling guide. */
export const fetchMyGuideBookingsThunk = createAsyncThunk<
  Booking[],
  void,
  { rejectValue: string }
>("userBookings/fetchMyGuideBookings", async (_, { rejectWithValue }) => {
  try {
    const response = await apiService.get<FetchResponse>("/guides/my-bookings");
    return (response.data?.data ?? []) as Booking[];
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

export const fetchMyGuideBookingByIdThunk = createAsyncThunk<
  Booking,
  string,
  { rejectValue: string }
>("userBookings/fetchMyGuideBookingById", async (bookingId, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Booking>(`/guides/my-bookings/${bookingId}`);
    return response.data as Booking;
  } catch (error: any) {
    return handleThunkError(error, rejectWithValue);
  }
});

// --- Balance payment -------------------------------------------------------

export const createFinalPaymentOrder = createAsyncThunk<any, string, { rejectValue: string }>(
  "userBookings/createFinalOrder",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.post<any>(`/tourguide/${bookingId}/create-final-order`);
      return response.data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

export const verifyFinalPayment = createAsyncThunk<
  Booking,
  {
    bookingId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  { rejectValue: string }
>("userBookings/verifyFinalPayment", async (paymentData, { rejectWithValue }) => {
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

export const fetchTourGuideBookingById = createAsyncThunk<Booking, string, { rejectValue: string }>(
  "userBookings/fetchById",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Booking>(`/tourguide/${bookingId}`);
      return response.data as Booking;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);
