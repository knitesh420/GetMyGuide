import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdminGuide } from "@/lib/data";
import { fetchAdminGuides } from "@/lib/redux/thunks/guide/adminGuideThunks";
import { deleteGuide } from "@/lib/redux/thunks/guide/guideThunk";

interface AdminGuidesState {
  guides: AdminGuide[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminGuidesState = {
  guides: [],
  loading: false,
  error: null,
};

const adminGuidesSlice = createSlice({
  name: "adminGuides",
  initialState,
  reducers: {},
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
      // DELETE /guide/:id is a soft delete — it clears `isActive` rather than
      // dropping the account, so keep the row and mark it suspended. Removing it
      // would hide the guide's history along with the guide.
      .addCase(deleteGuide.fulfilled, (state, action) => {
        const guide = state.guides.find((g) => g.accountId === action.payload);
        if (guide) guide.isActive = false;
      })
      .addCase(deleteGuide.rejected, (state, action: PayloadAction<unknown>) => {
        state.error = (action.payload as string) ?? "Failed to suspend the guide";
      });
  },
});

export default adminGuidesSlice.reducer;
