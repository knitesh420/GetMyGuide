import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdminTourist } from "@/lib/data";
import {
  activateTourist,
  deactivateTourist,
  fetchAdminTourists,
} from "@/lib/redux/thunks/tourist/adminTouristThunks";

interface AdminTouristsState {
  tourists: AdminTourist[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminTouristsState = {
  tourists: [],
  loading: false,
  error: null,
};

const adminTouristsSlice = createSlice({
  name: "adminTourists",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminTourists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminTourists.fulfilled, (state, action) => {
        state.loading = false;
        state.tourists = action.payload;
      })
      .addCase(fetchAdminTourists.rejected, (state, action: PayloadAction<unknown>) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load tourists";
      })
      // Deactivation is a soft delete, so keep the row and just flip its flag —
      // dropping it would hide the account the admin may want to restore.
      .addCase(deactivateTourist.fulfilled, (state, action) => {
        const tourist = state.tourists.find((t) => t.accountId === action.payload);
        if (tourist) {
          tourist.isActive = false;
          tourist.status = "inactive";
        }
      })
      .addCase(deactivateTourist.rejected, (state, action: PayloadAction<unknown>) => {
        state.error = (action.payload as string) ?? "Failed to deactivate the account";
      })
      .addCase(activateTourist.fulfilled, (state, action) => {
        const tourist = state.tourists.find((t) => t.accountId === action.payload);
        if (tourist) {
          tourist.isActive = true;
          tourist.status = "active";
        }
      })
      .addCase(activateTourist.rejected, (state, action: PayloadAction<unknown>) => {
        state.error = (action.payload as string) ?? "Failed to activate the account";
      });
  },
});

export default adminTouristsSlice.reducer;
