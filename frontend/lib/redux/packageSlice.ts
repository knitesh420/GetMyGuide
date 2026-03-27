import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AdminPackage } from '@/types/admin'; // Types ko common location se import karein
import {
  fetchPackages,
  addPackage,
  updatePackage,
  deletePackage,
  fetchPackageById,
  fetchRecommendedPackages 
} from './thunks/admin/packageThunks'; // Package thunks ko import karein

// ✅ Define a state shape specifically for this slice
interface PackageState {
  items: AdminPackage[];
  recommended: AdminPackage[]; 
  loading: 'idle' | 'pending' | 'succeeded' | 'failed'; // More descriptive loading state
  error: string | null;
  currentAction: 'fetching' | 'adding' | 'updating' | 'deleting' | 'fetchingRecommended' |null;
}

const initialState: PackageState = {
  items: [],
  loading: 'idle',
  recommended: [], 
  error: null,
  currentAction: null,
};

const packageSlice = createSlice({
  name: 'packages', // Slice ka unique naam
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Packages
      .addCase(fetchPackages.pending, (state) => {
        state.loading = 'pending';
        state.currentAction = 'fetching';
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action: PayloadAction<AdminPackage[]>) => {
        state.loading = 'succeeded';
        state.currentAction = null;
        state.items = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = 'failed';
        state.currentAction = null;
        state.error = action.payload as string;
      })

      // Add Package
      .addCase(addPackage.pending, (state) => {
        state.loading = 'pending';
        state.currentAction = 'adding';
        state.error = null;
      })
      .addCase(addPackage.fulfilled, (state, action: PayloadAction<AdminPackage>) => {
        state.loading = 'succeeded';
        state.currentAction = null;
        state.items.push(action.payload);
      })
      .addCase(addPackage.rejected, (state, action) => {
        state.loading = 'failed';
        state.currentAction = null;
        state.error = action.payload as string;
      })

      // Update Package
      .addCase(updatePackage.pending, (state) => {
        state.loading = 'pending';
        state.currentAction = 'updating';
        state.error = null;
      })
      .addCase(updatePackage.fulfilled, (state, action: PayloadAction<AdminPackage>) => {
        state.loading = 'succeeded';
        state.currentAction = null;
        const index = state.items.findIndex(pkg => pkg._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updatePackage.rejected, (state, action) => {
        state.loading = 'failed';
        state.currentAction = null;
        state.error = action.payload as string;
      })

      // Delete Package
      .addCase(deletePackage.pending, (state) => {
        state.loading = 'pending';
        state.currentAction = 'deleting';
        state.error = null;
      })
      .addCase(deletePackage.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = 'succeeded';
        state.currentAction = null;
        state.items = state.items.filter(pkg => pkg._id !== action.payload);
      })
      .addCase(deletePackage.rejected, (state, action) => {
        state.loading = 'failed';
        state.currentAction = null;
        state.error = action.payload as string;
      })
      .addCase(fetchPackageById.pending, (state) => {
        state.loading = 'pending';
        state.error = null;
      })
      .addCase(fetchPackageById.fulfilled, (state, action: PayloadAction<AdminPackage>) => {
        state.loading = 'succeeded';
        
        // Prevent duplicates: only add the package if it's not already in the list
        const exists = state.items.find(pkg => pkg._id === action.payload._id);
        if (!exists) {
          state.items.push(action.payload);
        }
      })
      .addCase(fetchPackageById.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchRecommendedPackages.pending, (state) => {
        state.loading = 'pending';
        state.currentAction = 'fetchingRecommended'; // Specific action type
        state.error = null;
      })
      .addCase(fetchRecommendedPackages.fulfilled, (state, action: PayloadAction<AdminPackage[]>) => {
        state.loading = 'succeeded';
        state.currentAction = null;
        // Yeh 'recommended' state ko update karta hai, 'items' ko nahi.
        state.recommended = action.payload; 
      })
      .addCase(fetchRecommendedPackages.rejected, (state, action) => {
        state.loading = 'failed';
        state.currentAction = null;
        state.error = action.payload as string;
      });
  },
});

export default packageSlice.reducer;