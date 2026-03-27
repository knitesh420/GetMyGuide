// lib/redux/slices/tourGuideBooking/userTourGuideBookingSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tourGuideBooking as Booking } from '@/lib/data';
import { fetchUserBookings,
   cancelBooking,
  fetchAllBookingsAdmin, 
  cancelBookingByAdmin,
  reassignGuideThunk,
  updateBookingStatusThunk,
  fetchMyGuideBookingsThunk,
  fetchMyGuideBookingByIdThunk,
  verifyFinalPayment,
  createFinalPaymentOrder,
  fetchTourGuideBookingById
    } from '@/lib/redux/thunks/tourGuideBooking/userTourGuideBookingThunks';

interface UserBookingsState {
  bookings: Booking[];
  loading: boolean;
  currentBooking: Booking | null; 
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    totalBookings: number;
  };
}

const initialState: UserBookingsState = {
  bookings: [],
  loading: false,
  currentBooking: null,
  error: null,
  pagination: {
    page: 1,
    totalPages: 1,
    totalBookings: 0,
  },
};

const userTourGuideBookingSlice = createSlice({
  name: 'userTourGuideBookings',
  initialState,
  reducers: {
    // ✅ ADDED: Action to clear the detail view state when leaving the page
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetching bookings
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Cancelling a booking
      // .addCase(cancelBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
      //   // Find the cancelled booking and update its status
      //   const index = state.bookings.findIndex(b => b._id === action.payload._id);
      //   if (index !== -1) {
      //     state.bookings[index] = action.payload;
      //   }
      // })
      .addCase(fetchAllBookingsAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllBookingsAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAllBookingsAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 🔥 NEW CASE for ADMIN cancelling a booking
      .addCase(cancelBookingByAdmin.fulfilled, (state, action: PayloadAction<Booking>) => {
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      .addCase(reassignGuideThunk.pending, (state) => {
        state.loading = true; // You might want a specific loading state for this action
      })
      .addCase(reassignGuideThunk.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        // Find and update the booking in the state array
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      .addCase(reassignGuideThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string; // You might want a specific error state
      })
      .addCase(updateBookingStatusThunk.pending, (state) => {
        // Optionally set a loading state
      })
      .addCase(updateBookingStatusThunk.fulfilled, (state, action: PayloadAction<Booking>) => {
        // This is the same logic as cancellation/reassignment: find and update the booking
        const index = state.bookings.findIndex(b => b._id === action.payload._id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      .addCase(updateBookingStatusThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchMyGuideBookingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyGuideBookingsThunk.fulfilled, (state, action: PayloadAction<Booking[]>) => {
        state.loading = false;
        state.bookings = action.payload; // Overwrites the list with the guide's bookings
      })
      .addCase(fetchMyGuideBookingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      .addCase(fetchMyGuideBookingByIdThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyGuideBookingByIdThunk.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        state.currentBooking = action.payload; // Populates the detail view state
      })
      .addCase(fetchMyGuideBookingByIdThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTourGuideBookingById.pending, (state) => {
        state.loading = true;
        state.currentBooking = null;
      })
      .addCase(fetchTourGuideBookingById.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        state.currentBooking = action.payload;
      })
      .addCase(fetchTourGuideBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- Verifying the final payment ---
      .addCase(verifyFinalPayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyFinalPayment.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.loading = false;
        const updatedBooking = action.payload;
        // Update the booking in the detail view
        state.currentBooking = updatedBooking;
        // Update the same booking in the main list for UI consistency
        state.bookings = state.bookings.map((b) =>
          b._id === updatedBooking._id ? updatedBooking : b
        );
      })
      .addCase(verifyFinalPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // --- Cancelling a booking ---
      .addCase(cancelBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        const updatedBooking = action.payload;
        state.currentBooking = updatedBooking;
        state.bookings = state.bookings.map((b) =>
          b._id === updatedBooking._id ? updatedBooking : b
        );
      });
  },
});

export const { clearCurrentBooking } = userTourGuideBookingSlice.actions;

export default userTourGuideBookingSlice.reducer;