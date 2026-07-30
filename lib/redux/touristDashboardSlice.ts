import { createSlice } from "@reduxjs/toolkit";
import { TouristDashboardState } from "@/lib/data";
import { fetchTouristDashboard } from "@/lib/redux/thunks/tourist/touristDashboardThunk";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/redux/thunks/notification/notificationThunks";

const initialState: TouristDashboardState = {
  overview: null,
  loading: false,
  error: null,
};

const touristDashboardSlice = createSlice({
  name: "touristDashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTouristDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTouristDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
      })
      .addCase(fetchTouristDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Marking a notification read from the dashboard preview reuses the
      // notification endpoints. Patch the cached overview in place rather than
      // refetching the whole dashboard for a one-field change.
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        if (!state.overview) return;
        const target = state.overview.notifications.find(
          (n) => n._id === action.payload._id,
        );
        if (!target || target.isRead) return;
        target.isRead = true;
        state.overview.stats.unreadNotifications = Math.max(
          0,
          state.overview.stats.unreadNotifications - 1,
        );
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        if (!state.overview) return;
        state.overview.notifications.forEach((n) => {
          n.isRead = true;
        });
        state.overview.stats.unreadNotifications = 0;
      });
  },
});

export default touristDashboardSlice.reducer;
