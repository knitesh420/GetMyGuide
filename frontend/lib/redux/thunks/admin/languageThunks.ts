// store/thunks/admin/languageThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/lib/service/api';
import { LanguageOption, CreateLanguageOption } from '@/types/admin';

const API_BASE_URL = '/api/languages';

/**
 * Fetches all language options from the server.
 */
export const fetchLanguages = createAsyncThunk<LanguageOption[]>(
  'admin/fetchLanguages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<LanguageOption[]>(API_BASE_URL);
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch languages');
    }
  }
);

/**
 * Adds a new language option.
 */
export const addLanguage = createAsyncThunk<LanguageOption, CreateLanguageOption>(
  'admin/addLanguage',
  async (languageData, { rejectWithValue }) => {
    try {
      const response = await apiService.post<LanguageOption>(API_BASE_URL, languageData);
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add language');
    }
  }
);

/**
 * Updates an existing language option.
 */
export const updateLanguage = createAsyncThunk<LanguageOption, LanguageOption>(
  'admin/updateLanguage',
  async (languageData, { rejectWithValue }) => {
    try {
      const { _id, ...updateData } = languageData;
      const response = await apiService.put<LanguageOption>(`${API_BASE_URL}/${_id}`, updateData);
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update language');
    }
  }
);

/**
 * Deletes a language option by its ID.
 */
export const deleteLanguage = createAsyncThunk<string, string>(
  'admin/deleteLanguage',
  async (languageId, { rejectWithValue }) => {
    try {
      await apiService.delete(`${API_BASE_URL}/${languageId}`);
      return languageId; // Return ID for successful removal from state
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete language');
    }
  }
);