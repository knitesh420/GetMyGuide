import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { toPaginated } from "@/lib/redux/thunks/paginate";
import { NotificationItem, PaginatedResult } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const fetchMyNotifications = createAsyncThunk<
  PaginatedResult<NotificationItem>,
  { page?: number; limit?: number; unreadOnly?: boolean } | undefined
>("notification/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<NotificationItem[]>(
      "/notification/my",
      { params },
    );
    return toPaginated<NotificationItem>(response);
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
      // { count } is spread onto the top level of the body.
      return (response as unknown as { count?: number }).count ?? 0;
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
      // The updated notification is spread onto the top level of the body.
      return response as unknown as NotificationItem;
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
    return {
      modifiedCount:
        (response as unknown as { modifiedCount?: number }).modifiedCount ?? 0,
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
