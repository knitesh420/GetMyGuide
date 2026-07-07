import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult, Trip } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const fetchAllTrips = createAsyncThunk<
  PaginatedResult<Trip>,
  { status?: string; guideId?: string; page?: number; limit?: number } | undefined
>("trip/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<Trip>>("/trip", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyTrips = createAsyncThunk<
  PaginatedResult<Trip>,
  { status?: string; page?: number; limit?: number } | undefined
>("trip/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<Trip>>("/trip/my", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyTripsAsTourist = createAsyncThunk<
  PaginatedResult<Trip>,
  { page?: number; limit?: number } | undefined
>("trip/fetchMine", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<Trip>>("/trip/mine", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchTripById = createAsyncThunk<Trip, string>(
  "trip/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Trip>(`/trip/${id}`);
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const startTrip = createAsyncThunk<Trip, { id: string; notes?: string }>(
  "trip/start",
  async ({ id, notes }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<Trip>(`/trip/${id}/start`, { notes });
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const completeTrip = createAsyncThunk<Trip, { id: string; completionNotes?: string }>(
  "trip/complete",
  async ({ id, completionNotes }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<Trip>(`/trip/${id}/complete`, { completionNotes });
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const cancelTrip = createAsyncThunk<Trip, { id: string; reason?: string }>(
  "trip/cancel",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<Trip>(`/trip/${id}/cancel`, { reason });
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
