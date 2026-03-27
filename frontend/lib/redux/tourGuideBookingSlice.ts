// lib/redux/bookingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tourGuideBooking as Booking } from '@/lib/data';
import { createAndVerifyBooking, verifyFinalPayment } from '@/lib/redux/thunks/tourGuideBooking/tourGuideBookingThunk';

interface BookingState {
  loading: boolean;
  currentBooking: Booking | null;
  error: string | null;
  latestBooking: Booking | null; // To store the successfully created booking
}

const initialState: BookingState = {
  loading: false,
  currentBooking: null, 
  error: null,
  latestBooking: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    clearBookingState: (state) => {
      state.loading = false;
      state.error = null;
      state.latestBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAndVerifyBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.latestBooking = null;
      })
      .addCase(createAndVerifyBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        state.latestBooking = action.payload;
      })
      .addCase(createAndVerifyBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- Verify Final Payment ---
      .addCase(verifyFinalPayment.pending, (state) => {
        state.loading = true; // Set loading state for the payment verification process
      })
      .addCase(verifyFinalPayment.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        const updatedBooking = action.payload;
        // Update the current booking being viewed
        state.currentBooking = updatedBooking;
        // Also update the booking in the main list for consistency
        state.bookings = state.bookings.map((b) =>
          b._id === updatedBooking._id ? updatedBooking : b
        );
      })
      .addCase(verifyFinalPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBookingState } = bookingSlice.actions;
export default bookingSlice.reducer;