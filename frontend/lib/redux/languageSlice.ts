// store/slices/admin/languageSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LanguageOption } from '@/types/admin';
import {
  fetchLanguages,
  addLanguage,
  updateLanguage,
  deleteLanguage,
} from './thunks/admin/languageThunks';

interface LanguageState {
  languages: LanguageOption[];
  loading: boolean;
  error: string | null;
}

const initialState: LanguageState = {
  languages: [],
  loading: false,
  error: null,
};

const languageSlice = createSlice({
  name: 'languages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Fetch Languages ---
      .addCase(fetchLanguages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLanguages.fulfilled, (state, action: PayloadAction<LanguageOption[]>) => {
        state.loading = false;
        state.languages = action.payload;
      })
      .addCase(fetchLanguages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- Add Language ---
      .addCase(addLanguage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLanguage.fulfilled, (state, action: PayloadAction<LanguageOption>) => {
        state.loading = false;
        state.languages.push(action.payload);
      })
      .addCase(addLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- Update Language ---
      .addCase(updateLanguage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLanguage.fulfilled, (state, action: PayloadAction<LanguageOption>) => {
        state.loading = false;
        const index = state.languages.findIndex((lang) => lang._id === action.payload._id);
        if (index !== -1) {
          state.languages[index] = action.payload;
        }
      })
      .addCase(updateLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // --- Delete Language ---
      .addCase(deleteLanguage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLanguage.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.languages = state.languages.filter((lang) => lang._id !== action.payload);
      })
      .addCase(deleteLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default languageSlice.reducer;