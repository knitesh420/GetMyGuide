import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminBookingSummary, AssignableGuide, Assignment, PaginatedResult } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Reuses the existing, unmodified GET /booking (admin) endpoint — the old
// frontend bookingThunks.ts targets a mismatched shape and is intentionally
// left untouched, so this fetches the real shape directly for this new page.
export const fetchBookingsAwaitingAssignment = createAsyncThunk<AdminBookingSummary[], void>(
  "assignment/fetchBookingsAwaitingAssignment",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminBookingSummary[]>("/booking");
      const bookings = response.data ?? [];
      return bookings.filter((b) => b.status === "successful" || b.status === "confirmed");
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const createAssignment = createAsyncThunk<
  Assignment,
  { bookingId: string; guideId: string; adminNotes?: string }
>("assignment/create", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<Assignment>("/assignment", payload);
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const respondToAssignment = createAsyncThunk<
  { assignment: Assignment; trip: unknown },
  { id: string; action: "accept" | "decline"; declineReason?: string }
>("assignment/respond", async ({ id, action, declineReason }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<{ assignment: Assignment; trip: unknown }>(
      `/assignment/${id}/respond`,
      { action, declineReason },
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const reassignGuide = createAsyncThunk<
  Assignment,
  { id: string; newGuideId: string; adminNotes?: string }
>("assignment/reassign", async ({ id, newGuideId, adminNotes }, { rejectWithValue }) => {
  try {
    const response = await apiService.post<Assignment>(`/assignment/${id}/reassign`, {
      newGuideId,
      adminNotes,
    });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchAssignableGuides = createAsyncThunk<AssignableGuide[], void>(
  "assignment/fetchAssignableGuides",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AssignableGuide[]>("/assignment/guides");
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const fetchAssignments = createAsyncThunk<
  PaginatedResult<Assignment>,
  { status?: string; guideId?: string; bookingId?: string; page?: number; limit?: number } | undefined
>("assignment/fetchAll", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<Assignment>>("/assignment", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyAssignments = createAsyncThunk<
  PaginatedResult<Assignment>,
  { status?: string; page?: number; limit?: number } | undefined
>("assignment/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<Assignment>>("/assignment/my", { params });
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
