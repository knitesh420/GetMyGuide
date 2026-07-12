import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { TouristDashboardOverview } from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

// Respond() spreads its payload onto the top level of the body, so the overview's
// sections (profile, stats, …) arrive as siblings of `success` rather than under
// `data`. Tolerate a nested `data` too, in case the endpoint is ever wrapped.
const unwrapOverview = (response: unknown): TouristDashboardOverview => {
  const body = response as { data?: TouristDashboardOverview } &
    TouristDashboardOverview;
  return body.data ?? body;
};

/**
 * Loads the whole of Dashboard Home in one request. The detail pages (My
 * Bookings, My Trips, Reviews, Notifications) keep their own endpoints — this
 * only backs the summary view.
 */
export const fetchTouristDashboard = createAsyncThunk<
  TouristDashboardOverview,
  void
>("touristDashboard/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await apiService.get<TouristDashboardOverview>(
      "/tourist/dashboard",
    );
    return unwrapOverview(response);
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
