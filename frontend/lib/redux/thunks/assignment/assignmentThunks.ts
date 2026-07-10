import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import {
  AdminBookingSummary,
  AssignableGuide,
  Assignment,
  GuideAvailabilityInfo,
  GuideCalendar,
  PaginatedResult,
} from "@/lib/data";

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
  {
    bookingId: string;
    guideId: string;
    adminNotes?: string;
    override?: boolean;
    overrideReason?: string;
  }
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
  {
    id: string;
    newGuideId: string;
    adminNotes?: string;
    override?: boolean;
    overrideReason?: string;
  }
>("assignment/reassign", async ({ id, newGuideId, adminNotes, override, overrideReason }, { rejectWithValue }) => {
  try {
    const response = await apiService.post<Assignment>(`/assignment/${id}/reassign`, {
      newGuideId,
      adminNotes,
      override,
      overrideReason,
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
    const response = await apiService.get<Assignment[]>("/assignment", { params });
    return toPaginated(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyAssignments = createAsyncThunk<
  PaginatedResult<Assignment>,
  { status?: string; page?: number; limit?: number } | undefined
>("assignment/fetchMy", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<Assignment[]>("/assignment/my", { params });
    return toPaginated(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// --- Guide Availability & Booking Conflict System (admin) ---

// Assignable guides annotated with availability + conflicts for a date
// range — feeds the Available/Unavailable Guides panel and the Assign
// Guide modal's conflict badges.
export const fetchGuidesAvailability = createAsyncThunk<
  GuideAvailabilityInfo[],
  { startDate: string; endDate?: string }
>("assignment/fetchGuidesAvailability", async (params, { rejectWithValue }) => {
  try {
    const response = await apiService.get<GuideAvailabilityInfo[]>("/guide-availability/guides", { params });
    return response.data ?? [];
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// Merged calendar (unavailable dates + leaves + booked ranges) for a single
// guide — feeds the admin Guide Calendar page.
export const fetchGuideCalendar = createAsyncThunk<GuideCalendar, string>(
  "assignment/fetchGuideCalendar",
  async (guideId, { rejectWithValue }) => {
    try {
      // Respond() spreads the calendar object onto the top level of the body.
      const response = await apiService.get<GuideCalendar>(`/guide-availability/calendar/${guideId}`);
      return response as unknown as GuideCalendar;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
