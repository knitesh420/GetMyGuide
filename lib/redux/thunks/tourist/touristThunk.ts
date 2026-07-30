import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { TouristProfile } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// The backend's Respond() helper does `res.json({ ...data, success: true })`, so
// the profile's fields land on the top level of the body — `response.data` is
// undefined. Reading it left `myProfile` unset, which blanked the dashboard and
// stopped the onboarding form prefilling. Fall back to a nested `data` in case
// an endpoint ever switches to a wrapped envelope.
const unwrapProfile = (response: unknown): TouristProfile => {
  const body = response as { data?: TouristProfile } & TouristProfile;
  return body.data ?? body;
};

export const getMyTouristProfile = createAsyncThunk<TouristProfile, void>(
  "tourist/getMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<TouristProfile>("/tourist/profile");
      return unwrapProfile(response);
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
      return unwrapProfile(response);
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);
