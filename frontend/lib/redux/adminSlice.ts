
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AdminState, AdminLocation, LanguageOption, AdminPackage } from '@/types/admin';

// Import all async thunks
import {
  fetchAdminLocations,
  addAdminLocation,
  updateAdminLocation,
  deleteAdminLocation
} from './thunks/admin/locationThunks'; // Path is relative from slices folder
import {
  fetchLanguages,
  addLanguage,
  updateLanguage,
  deleteLanguage
} from './thunks/admin/languageThunks';
import {
  fetchPackages,
  addPackage,
  updatePackage,
  deletePackage
} from './thunks/admin/packageThunks';

const initialState: AdminState = {
  locations: [],
  languages: [],
  packages: [],
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Location Reducers ---
      .addCase(fetchAdminLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload;
      })
      .addCase(addAdminLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations.push(action.payload);
      })
      .addCase(updateAdminLocation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.locations.findIndex(loc => loc._id === action.payload._id);
        if (index !== -1) state.locations[index] = action.payload;
      })
      .addCase(deleteAdminLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = state.locations.filter(loc => loc._id !== action.payload);
      })

      // --- Language Reducers ---
      .addCase(fetchLanguages.fulfilled, (state, action) => {
        state.loading = false;
        state.languages = action.payload;
      })
      .addCase(addLanguage.fulfilled, (state, action) => {
        state.loading = false;
        state.languages.push(action.payload);
      })
      .addCase(updateLanguage.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.languages.findIndex(lang => lang._id === action.payload._id);
        if (index !== -1) state.languages[index] = action.payload;
      })
      .addCase(deleteLanguage.fulfilled, (state, action) => {
        state.loading = false;
        state.languages = state.languages.filter(lang => lang._id !== action.payload);
      })

      // --- Package Reducers ---
      .addCase(fetchPackages.fulfilled, (state, action: PayloadAction<AdminPackage[]>) => {
        state.packages = action.payload;
      })
      .addCase(addPackage.fulfilled, (state, action: PayloadAction<AdminPackage>) => {
        state.packages.push(action.payload);
      })
      .addCase(updatePackage.fulfilled, (state, action: PayloadAction<AdminPackage>) => {
        const index = state.packages.findIndex(pkg => pkg._id === action.payload._id);
        if (index !== -1) {
          state.packages[index] = action.payload;
        }
      })
      .addCase(deletePackage.fulfilled, (state, action: PayloadAction<string>) => {
        state.packages = state.packages.filter(pkg => pkg._id !== action.payload);
      })
      // --- Generic Handlers (must come last for TS builder types) ---
      .addMatcher(
        (action) => action.type.startsWith('admin/') && action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action): action is PayloadAction<string> => action.type.startsWith('admin/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export default adminSlice.reducer;