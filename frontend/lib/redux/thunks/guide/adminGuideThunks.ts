import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminGuide, AdminGuideDetail } from "@/lib/data";

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

/**
 * GET /guide/admin/:id — one guide in full, admin only. This is the only
 * endpoint that returns payment identifiers, bank details or internal notes.
 *
 * Respond() spreads the payload onto the envelope root; apiService's `unwrap`
 * folds those loose fields back under `data`, so the detail object arrives there.
 */
export const fetchAdminGuideDetail = createAsyncThunk<
  AdminGuideDetail,
  string,
  { rejectValue: string }
>("adminGuides/fetchDetail", async (accountId, { rejectWithValue }) => {
  try {
    const response = await apiService.get<AdminGuideDetail>(`/guide/admin/${accountId}`);
    return response.data as AdminGuideDetail;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

/** PUT /guide/:id/notes — internal notes. An empty string clears them. */
export const saveGuideNotes = createAsyncThunk<
  { adminNotes: string; adminNotesUpdatedAt: string },
  { accountId: string; notes: string },
  { rejectValue: string }
>("adminGuides/saveNotes", async ({ accountId, notes }, { rejectWithValue }) => {
  try {
    const response = await apiService.put<{ adminNotes: string; adminNotesUpdatedAt: string }>(
      `/guide/${accountId}/notes`,
      { notes },
    );
    return response.data as { adminNotes: string; adminNotesUpdatedAt: string };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
