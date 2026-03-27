import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '@/lib/service/api';
import { AdminLocation } from '@/types/admin';

// ✅ fetchAdminLocations and deleteAdminLocation remain unchanged as they don't handle files.
export const fetchAdminLocations = createAsyncThunk<AdminLocation[]>(
  'admin/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminLocation[]>('/api/locations');
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch locations');
    }
  }
);

export const deleteAdminLocation = createAsyncThunk<string, string>(
  'admin/deleteLocation',
  async (locationId, { rejectWithValue }) => {
    try {
      await apiService.delete(`/api/locations/${locationId}`);
      return locationId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete location');
    }
  }
);

// fetchAdminLocations and deleteAdminLocation remain the same

// 🔥 UPDATED: addAdminLocation ab custom header bhejega
export const addAdminLocation = createAsyncThunk<AdminLocation, FormData>(
  'admin/addLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await apiService.post<AdminLocation>(
        '/api/locations',
        locationData,
        {
          headers: {
            'Content-Type': 'multipart/form-data', // Yeh header default ko override kar dega
          },
        }
      );
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add new location');
    }
  }
);

// 🔥 UPDATED: updateAdminLocation bhi custom header bhejega
export const updateAdminLocation = createAsyncThunk<AdminLocation, { id: string; locationData: FormData }>(
  'admin/updateLocation',
  async ({ id, locationData }, { rejectWithValue }) => {
    try {
      const response = await apiService.put<AdminLocation>(
        `/api/locations/${id}`,
        locationData,
        {
          headers: {
            'Content-Type': 'multipart/form-data', // Default ko override karein
          },
        }
      );
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update location');
    }
  }
);