import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminGuide } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// GET /guide/admin/all — the controller wraps the array under `data`, so the
// Respond() envelope arrives with `response.data` as the guide array.
export const fetchAdminGuides = createAsyncThunk<AdminGuide[], void>(
  "adminGuides/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminGuide[]>("/guide/admin/all");
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
