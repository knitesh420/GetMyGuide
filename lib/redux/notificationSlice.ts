import { createSlice } from "@reduxjs/toolkit";
import { NotificationItem } from "@/lib/data";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/redux/thunks/notification/notificationThunks";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; totalPages: number };
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchMyNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          (n) => n._id === action.payload._id,
        );
        if (index !== -1) state.notifications[index] = action.payload;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          isRead: true,
        }));
        state.unreadCount = 0;
      });
  },
});

export default notificationSlice.reducer;
