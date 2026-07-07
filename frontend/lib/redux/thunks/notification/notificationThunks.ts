import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { NotificationItem, PaginatedResult } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const fetchMyNotifications = createAsyncThunk<
  PaginatedResult<NotificationItem>,
  { page?: number; limit?: number; unreadOnly?: boolean } | undefined
>("notification/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<NotificationItem>>(
      "/notification/my",
      { params },
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchUnreadCount = createAsyncThunk<number, void>(
  "notification/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ count: number }>(
        "/notification/my/unread-count",
      );
      return response.data?.count ?? 0;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const markNotificationRead = createAsyncThunk<NotificationItem, string>(
  "notification/markRead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<NotificationItem>(
        `/notification/${id}/read`,
      );
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk<
  { modifiedCount: number },
  void
>("notification/markAllRead", async (_, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<{ modifiedCount: number }>(
      "/notification/read-all",
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
