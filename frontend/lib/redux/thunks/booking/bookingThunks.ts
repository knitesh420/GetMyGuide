// File: lib/redux/thunks/booking/bookingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminBookingSummary } from "@/lib/data";

// Interfaces
interface CreatePackageOrderData {
  tourId: string;
  guideId: string;
  startDate: string;
  endDate: string;
  tourists: number;
}

interface VerifyPackagePaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_data: string;
}

// Helper function for consistent error handling
const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message = error.message || "An unknown error occurred";
  console.error("Thunk Error:", message, error);
  return rejectWithValue(message);
};

type BookingEnvelope = { bookings: AdminBookingSummary[] };

// Respond() spreads its payload onto the top level, so the controllers'
// `data: { bookings }` arrives as `{ bookings: [...], success: true }` on the
// response body — the array lives at `response.bookings`, not `response.data`.
// Tolerate a nested `data` shape as well in case an endpoint ever changes.
const unwrapBookings = (
  response:
    | (Partial<BookingEnvelope> & {
        data?: BookingEnvelope | AdminBookingSummary[];
      })
    | AdminBookingSummary[]
    | undefined,
): AdminBookingSummary[] => {
  if (Array.isArray(response)) return response;
  if (!response) return [];
  if (Array.isArray(response.bookings)) return response.bookings;
  const nested = response.data;
  if (Array.isArray(nested)) return nested;
  return nested?.bookings ?? [];
};

// Create a Razorpay order for a package-tour booking (20% advance). The backend
// recomputes the price from the package + guide, so it can't be tampered with.
export const createRazorpayOrder = createAsyncThunk(
  "bookings/createPackageOrder",
  async (orderData: CreatePackageOrderData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/booking/package/create-order",
        orderData,
        // The create-order route is idempotency-guarded; a fresh key per attempt
        // prevents a double-click from creating two Razorpay orders.
        { headers: { "x-idempotency-key": crypto.randomUUID() } },
      );
      // Respond() spreads the payload to the top level, so the fields live on
      // `response` itself; fall back to `response.data` if that ever changes.
      const payload = (response as any).data ?? response;
      if (response.success && payload) {
        return payload;
      }
      throw new Error(response.message || "Failed to create payment order");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  },
);

// Verify the Razorpay signature and create the package booking. Returns the
// created booking (with package/guide info) which the confirmation page reads.
export const verifyPaymentAndCreateBooking = createAsyncThunk<
  AdminBookingSummary,
  VerifyPackagePaymentData
>(
  "bookings/verifyPackage",
  async (verificationData: VerifyPackagePaymentData, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/booking/package/verify",
        verificationData,
      );
      const payload = (response as any).data ?? response;
      if (response.success && payload) {
        return payload as AdminBookingSummary;
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
      return unwrapBookings(response);
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
      return unwrapBookings(response);
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
      return unwrapBookings(response);
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
      // Respond() spreads the booking to the top level of the body.
      const payload = (response as any).data ?? response;
      if (response.success && payload) {
        return payload as AdminBookingSummary;
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
