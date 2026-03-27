// lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { tourGuideBooking as Booking } from "@/lib/data";


const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message = error.response?.data?.message || error.message || "An unknown error occurred";
  console.error("Thunk Error:", message, error);
  return rejectWithValue(message);
};

interface FetchParams {
  page: number;
  limit: number;
}

// This interface should match the structure of the JSON response body
interface FetchResponse {
  data: Booking[];
  pagination: {
    page: number;
    totalPages: number;
    totalBookings: number;
  };
  // You can add other properties from the response if needed
  success?: boolean;
  count?: number;
}

// Thunk to fetch a user's bookings
export const fetchUserBookings = createAsyncThunk<
  FetchResponse,
  FetchParams,
  { rejectValue: string }
>("userBookings/fetch", async ({ page, limit }, { rejectWithValue }) => {
  try {
    const response = await apiService.get<FetchResponse>(
      `/api/tourguide/user-bookings?page=${page}&limit=${limit}`
    );
    // ✅ CORRECTION: Return the entire response object, not just the .data property.
    // The slice needs the whole object to get both .data and .pagination.
    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch bookings.");
  }
});

// Thunk to cancel a booking (No changes needed here)
export const cancelBooking = createAsyncThunk<
  Booking, 
  { bookingId: string; reason: string },
  { rejectValue: string }
>("userBookings/cancel", async ({ bookingId, reason }, { rejectWithValue }) => {
  try {
    // Assuming the cancel endpoint returns the updated booking object directly in its `data` field
    const response = await apiService.post<{ data: Booking }>(
      `/api/tourguide/${bookingId}/cancel`,
      { reason }
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to cancel booking.");
  }
});

export const fetchAllBookingsAdmin = createAsyncThunk<
  FetchResponse,
  FetchParams,
  { rejectValue: string }
>("userBookings/fetchAllAdmin", async ({ page, limit }, { rejectWithValue }) => { // Note the unique name: "userBookings/fetchAllAdmin"
  try {
    const response = await apiService.get<FetchResponse>(
      `/api/tourguide/all?page=${page}&limit=${limit}`
    );
    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch all bookings for admin.");
  }
});

// Thunk for an admin to cancel ANY booking
export const cancelBookingByAdmin = createAsyncThunk<
  Booking,
  { bookingId: string; reason: string },
  { rejectValue: string }
>("userBookings/cancelByAdmin", async ({ bookingId, reason }, { rejectWithValue }) => { // Note the unique name: "userBookings/cancelByAdmin"
  try {
    const response = await apiService.post<{ data: Booking }>(
      `/api/tourguide/${bookingId}/cancel`,
      { reason }
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to cancel booking as admin.");
  }
});

export const reassignGuideThunk = createAsyncThunk<
  Booking, // Returns the updated booking object
  { bookingId: string; newGuideId: string },
  { rejectValue: string }
>("userBookings/reassignGuide", async ({ bookingId, newGuideId }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<{ data: Booking }>(
      `/api/tourguide/${bookingId}/reassign-guide`,
      { newGuideId }
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to reassign guide.");
  }
});


/**
 * 🔥 NEW THUNK: Update a booking's status (for "Upcoming" or "Completed")
 * @desc    Calls the PATCH endpoint to change status without refund logic.
 */
export const updateBookingStatusThunk = createAsyncThunk<
  Booking, // Returns the updated booking object
  { bookingId: string; status: 'Upcoming' | 'Completed' },
  { rejectValue: string }
>("userBookings/updateStatus", async ({ bookingId, status }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<{ data: Booking }>(
      `/api/tourguide/${bookingId}/status`,
      { status } // The body just needs the new status
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to update booking status.");
  }
});

/**
 * @desc    Fetches all bookings assigned to the currently logged-in guide.
 * @route   GET /api/guides/my-bookings
 */
export const fetchMyGuideBookingsThunk = createAsyncThunk<
  Booking[], // Returns an array of bookings
  void,      // No arguments needed
  { rejectValue: string }
>("userBookings/fetchMyGuideBookings", async (_, { rejectWithValue }) => {
  try {
    // Note: The backend for this returns the array directly, not nested in a `data` property.
    const response = await apiService.get<Booking[]>(
      '/api/guides/my-bookings'
    );
    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch guide's bookings.");
  }
});

export const fetchMyGuideBookingByIdThunk = createAsyncThunk<
  Booking,    // Returns a single booking object
  string,     // Argument is the bookingId string
  { rejectValue: string }
>("userBookings/fetchMyGuideBookingById", async (bookingId, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Booking>(
      `/api/guides/my-bookings/${bookingId}`
    );
    return response;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch booking details.");
  }
});

// --- THUNKS FOR FINAL PAYMENT FLOW ---

// Step 1 of Payment: Creates the Razorpay order on the backend
export const createFinalPaymentOrder = createAsyncThunk<any, string, { rejectValue: string }>(
  "userBookings/createFinalOrder",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.post<{ data: any }>(`/api/tourguide/${bookingId}/create-final-order`);
      return response.data; // Returns the full Razorpay order object
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

// Step 2 of Payment: Verifies the payment details with the backend
export const verifyFinalPayment = createAsyncThunk<
  Booking,
  { bookingId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; },
  { rejectValue: string }
>(
  "userBookings/verifyFinalPayment",
  async (paymentData, { rejectWithValue }) => {
    try {
      const { bookingId, ...verificationDetails } = paymentData;
      const response = await apiService.post<{ data: Booking }>(`/api/tourguide/${bookingId}/verify-final-payment`, verificationDetails);
      return response.data; // Returns the updated booking object on success
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);


export const fetchTourGuideBookingById = createAsyncThunk<Booking, string, { rejectValue: string }>(
  "userBookings/fetchById",
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ data: Booking }>(`/api/tourguide/${bookingId}`);
      return response.data;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);