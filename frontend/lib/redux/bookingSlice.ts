// File: lib/redux/slices/bookingSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Booking } from "@/lib/data";
import {
  // Thunks from your file
  createRazorpayOrder,
  verifyPaymentAndCreateBooking,
  createRemainingPaymentOrder,
  verifyRemainingPayment,
  fetchMyBookings,
  fetchBookingById,
  cancelAndRefundBooking,
  fetchGuideBookings,
  fetchAllBookings, // ✅ Isse import karein
  deleteBooking, // ✅ Isse bhi import kar lein, component mein use ho raha hai
} from "./thunks/booking/bookingThunks";
interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
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
        (state, action: PayloadAction<Booking>) => {
          state.loading = false;
          state.currentBooking = action.payload;
        }
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
        (state, action: PayloadAction<Booking[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        }
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
        (state, action: PayloadAction<Booking[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        }
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
        (state, action: PayloadAction<Booking[]>) => {
          state.loading = false;
          state.bookings = action.payload;
        }
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
        (state, action: PayloadAction<Booking>) => {
          state.loading = false;
          state.currentBooking = action.payload;
        }
      )
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(cancelAndRefundBooking.pending, (state) => {
        // Aap loading state manage kar sakte hain, maybe a specific one
      })
      .addCase(
        cancelAndRefundBooking.fulfilled,
        (state, action: PayloadAction<Booking>) => {
          state.loading = false;
          const updatedBooking = action.payload;
          state.bookings = state.bookings.map((b) =>
            b._id === updatedBooking._id ? updatedBooking : b
          );
          if (state.currentBooking?._id === updatedBooking._id) {
            state.currentBooking = updatedBooking;
          }
        }
      )
      .addCase(cancelAndRefundBooking.rejected, (state, action) => {
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
            (b) => b._id !== action.payload
          );
        }
      )
      .addCase(deleteBooking.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // --- YAHAN TAK DELETE KA CODE HAI ---

      .addCase(createRemainingPaymentOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRemainingPaymentOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyRemainingPayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        verifyRemainingPayment.fulfilled,
        (state, action: PayloadAction<Booking>) => {
          state.loading = false;
          const updatedBooking = action.payload;
          state.bookings = state.bookings.map((b) =>
            b._id === updatedBooking._id ? updatedBooking : b
          );
          if (state.currentBooking?._id === updatedBooking._id) {
            state.currentBooking = updatedBooking;
          }
        }
      )
      .addCase(verifyRemainingPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBookingError, clearCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;