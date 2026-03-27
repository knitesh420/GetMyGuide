import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";

export interface TouristProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TouristsResponse {
  tourists: TouristProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Get all tourists
export const adminGetAllTourists = createAsyncThunk<
  TouristsResponse,
  { page?: number; limit?: number; search?: string }
>(
  "admin/getAllTourists",
  async ({ page = 1, limit = 10, search = "" }, { rejectWithValue }) => {
    try {
      const response = await apiService.get<TouristsResponse>("/api/user/tourists", {
        params: { page, limit, search },
      });
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Delete (deactivate) a tourist
export const deleteTourist = createAsyncThunk<string, string>(
  "admin/deleteTourist",
  async (touristId, { rejectWithValue }) => {
    try {
      await apiService.delete(`/api/user/${touristId}`);
      return touristId;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);
