import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdminGuide, AdminGuideDetail } from "@/lib/data";
import {
  fetchAdminGuideDetail,
  fetchAdminGuides,
  saveGuideNotes,
} from "@/lib/redux/thunks/guide/adminGuideThunks";
import { deleteGuide } from "@/lib/redux/thunks/guide/guideThunk";

interface AdminGuidesState {
  guides: AdminGuide[];
  /** The guide whose detail page is open, if any. */
  detail: AdminGuideDetail | null;
  loading: boolean;
  detailLoading: boolean;
  savingNotes: boolean;
  error: string | null;
}

const initialState: AdminGuidesState = {
  guides: [],
  detail: null,
  loading: false,
  detailLoading: false,
  savingNotes: false,
  error: null,
};

const adminGuidesSlice = createSlice({
  name: "adminGuides",
  initialState,
  reducers: {
    /** Opening a different guide must not flash the previous one's data. */
    clearAdminGuideDetail: (state) => {
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminGuides.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminGuides.fulfilled, (state, action) => {
        state.loading = false;
        state.guides = action.payload;
      })
      .addCase(fetchAdminGuides.rejected, (state, action: PayloadAction<unknown>) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load guides";
      })

      .addCase(fetchAdminGuideDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminGuideDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload;
      })
      .addCase(fetchAdminGuideDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = (action.payload as string) ?? "Failed to load the guide";
      })

      .addCase(saveGuideNotes.pending, (state) => {
        state.savingNotes = true;
      })
      .addCase(saveGuideNotes.fulfilled, (state, action) => {
        state.savingNotes = false;
        if (state.detail) {
          state.detail.adminNotes = action.payload.adminNotes;
          state.detail.adminNotesUpdatedAt = action.payload.adminNotesUpdatedAt;
        }
      })
      .addCase(saveGuideNotes.rejected, (state, action) => {
        state.savingNotes = false;
        state.error = (action.payload as string) ?? "Failed to save the notes";
      })
      // DELETE /guide/:id is a soft delete — it clears `isActive` rather than
      // dropping the account, so keep the row and mark it suspended. Removing it
      // would hide the guide's history along with the guide.
      .addCase(deleteGuide.fulfilled, (state, action) => {
        const guide = state.guides.find((g) => g.accountId === action.payload);
        if (guide) guide.isActive = false;
        if (state.detail?.accountId === action.payload) state.detail.isActive = false;
      })
      .addCase(deleteGuide.rejected, (state, action: PayloadAction<unknown>) => {
        state.error = (action.payload as string) ?? "Failed to suspend the guide";
      });
  },
});

export const { clearAdminGuideDetail } = adminGuidesSlice.actions;
export default adminGuidesSlice.reducer;
