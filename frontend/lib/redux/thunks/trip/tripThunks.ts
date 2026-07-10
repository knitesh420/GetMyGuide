import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { PaginatedResult, Trip } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// The backend's Respond() helper spreads its payload onto the top level, so a
// paginated list arrives as { data: [...], total, page, totalPages } directly
// on the response body — `response.data` is the array, not a nested envelope.
// Rebuild the PaginatedResult the reducers expect from those flat fields.
function toPaginated<T>(response: {
  data?: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}): PaginatedResult<T> {
  return {
    data: response.data ?? [],
    total: response.total ?? 0,
    page: response.page ?? 1,
    totalPages: response.totalPages ?? 0,
  };
}

export const fetchAllTrips = createAsyncThunk<
  PaginatedResult<Trip>,
  { status?: string; guideId?: string; page?: number; limit?: number } | undefined
>("trip/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Trip[]>("/trip", { params });
    return toPaginated(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyTrips = createAsyncThunk<
  PaginatedResult<Trip>,
  { status?: string; page?: number; limit?: number } | undefined
>("trip/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Trip[]>("/trip/my", { params });
    return toPaginated(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyTripsAsTourist = createAsyncThunk<
  PaginatedResult<Trip>,
  { page?: number; limit?: number } | undefined
>("trip/fetchMine", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Trip[]>("/trip/mine", { params });
    return toPaginated(response);
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
