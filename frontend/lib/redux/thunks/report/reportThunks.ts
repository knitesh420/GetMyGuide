import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import {
  ActivityLogEntry,
  BookingsTrendPoint,
  GuidePerformanceRow,
  PaginatedResult,
  ReportOverview,
} from "@/lib/data";

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";

export const fetchReportOverview = createAsyncThunk<ReportOverview, void>(
  "report/fetchOverview",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<ReportOverview>("/report/overview");
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const fetchBookingsTrend = createAsyncThunk<
  BookingsTrendPoint[],
  "7d" | "30d" | "90d" | undefined
>("report/fetchBookingsTrend", async (range = "30d", { rejectWithValue }) => {
  try {
    const response = await apiService.get<BookingsTrendPoint[]>("/report/bookings-trend", {
      params: { range },
    });
    return response.data ?? [];
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const fetchGuidePerformance = createAsyncThunk<GuidePerformanceRow[], number | undefined>(
  "report/fetchGuidePerformance",
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuidePerformanceRow[]>("/report/guide-performance", {
        params: { limit },
      });
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const fetchActivityLog = createAsyncThunk<
  PaginatedResult<ActivityLogEntry>,
  { page?: number; limit?: number; action?: string; actorType?: "user" | "system" } | undefined
>("report/fetchActivityLog", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<PaginatedResult<ActivityLogEntry>>(
      "/report/activity-log",
      { params },
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});
