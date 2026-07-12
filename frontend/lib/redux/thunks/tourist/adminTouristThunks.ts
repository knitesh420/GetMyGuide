import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminTourist } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// GET /tourist/admin/all — the controller wraps the array under `data`, so the
// Respond() envelope arrives with `response.data` as the tourist array.
export const fetchAdminTourists = createAsyncThunk<AdminTourist[], void>(
  "adminTourists/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminTourist[]>("/tourist/admin/all");
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

/**
 * Suspend an account. This is a soft delete — DELETE /user/:id flips `isActive`
 * rather than dropping the row, so the tourist's bookings and history survive
 * and `activateTourist` below can put them back. The endpoint is keyed by
 * *account* id, not the tourist profile id.
 */
export const deactivateTourist = createAsyncThunk<string, string>(
  "adminTourists/deactivate",
  async (accountId, { rejectWithValue }) => {
    try {
      await apiService.delete(`/user/${accountId}`);
      return accountId;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

/** Restore access to a suspended account — the inverse of `deactivateTourist`. */
export const activateTourist = createAsyncThunk<string, string>(
  "adminTourists/activate",
  async (accountId, { rejectWithValue }) => {
    try {
      await apiService.patch(`/user/${accountId}/activate`);
      return accountId;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
