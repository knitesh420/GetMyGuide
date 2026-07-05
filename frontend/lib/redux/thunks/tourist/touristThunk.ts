import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { TouristProfile } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const getMyTouristProfile = createAsyncThunk<TouristProfile, void>(
  "tourist/getMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<TouristProfile>("/tourist/profile");
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export interface TouristProfileInput {
  nationality: string;
  preferredLanguages: string[];
  travelInterests: string[];
  budget: string;
  travelDates?: { startDate?: string; endDate?: string };
  numberOfTravelers: number;
  about: string;
}

export const updateMyTouristProfile = createAsyncThunk<TouristProfile, TouristProfileInput>(
  "tourist/updateMyProfile",
  async (data, { rejectWithValue }) => {
    try {
      const response = await apiService.put<TouristProfile>("/tourist/profile", data);
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
