// File: lib/redux/slices/bookingSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdminBookingSummary } from "@/lib/data";
import {
  // Thunks from your file
  createRazorpayOrder,
  verifyPaymentAndCreateBooking,
  fetchMyBookings,
  fetchBookingById,
  fetchGuideBookings,
  fetchAllBookings, // ✅ Isse import karein
  deleteBooking, // ✅ Isse bhi import kar lein, component mein use ho raha hai
} from "./thunks/booking/bookingThunks";
interface BookingState {
  bookings: AdminBookingSummary[];
  currentBooking: AdminBookingSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
};

const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    clearBookingError: (state) => {
      state.error = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Existing Cases ---
      .addCase(verifyPaymentAndCreateBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        verifyPaymentAndCreateBooking.fulfilled,
        (state, action: PayloadAction<AdminBookingSummary>) => {
          state.loading = false;
          state.currentBooking = action.payload;
        },
      )
      .addCase(verifyPaymentAndCreateBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- fetchMyBookings Cases ---
      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyBookings.fulfilled,
        (state, action: PayloadAction<AdminBookingSummary[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        },
      )
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ --- YEH NAYA CODE ADD KIYA GAYA HAI ---
      // --- fetchAllBookings Cases (for Admin) ---
      .addCase(fetchAllBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAllBookings.fulfilled,
        (state, action: PayloadAction<AdminBookingSummary[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        },
      )
      .addCase(fetchAllBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- YAHAN TAK NAYA CODE HAI ---

      // --- fetchGuideBookings Cases ---
      .addCase(fetchGuideBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchGuideBookings.fulfilled,
        (state, action: PayloadAction<AdminBookingSummary[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        },
      )
      .addCase(fetchGuideBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentBooking = null;
      })
      .addCase(
        fetchBookingById.fulfilled,
        (state, action: PayloadAction<AdminBookingSummary>) => {
          state.loading = false;
          state.currentBooking = action.payload;
        },
      )
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ✅ --- DELETE BOOKING KE LIYE BHI LOGIC ADD KARNA ZARURI HAI ---
      .addCase(deleteBooking.pending, (state) => {
        // Optional: Manage loading state for a specific item
      })
      .addCase(
        deleteBooking.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.bookings = state.bookings.filter(
            (b) => b._id !== action.payload,
          );
        },
      )
      .addCase(deleteBooking.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearBookingError, clearCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
