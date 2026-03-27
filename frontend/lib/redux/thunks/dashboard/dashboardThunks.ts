import { createAsyncThunk } from "@reduxjs/toolkit";
// Apne project ke hisaab se apiService ka sahi path dein
import { apiService } from "@/lib/service/api"; 

/**
 * @desc    Dashboard statistics fetch karne ke liye ek asynchronous thunk.
 *          Yeh user ke role ke hisaab se (admin, guide, user) data laata hai.
 * @route   GET /api/dashboard/stats
 */
export const fetchDashboardStats = createAsyncThunk(
  "dashboard/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      // API endpoint ko call karein
      const response = await apiService.get("/api/dashboard/stats");

      // Agar response successful hai aur data maujood hai, to data return karein
      if (response.success && response.data) {
        return response.data;
      }

      // Agar success false hai ya data nahi hai, to error throw karein
      throw new Error(response.message || "Failed to fetch dashboard statistics");
    } catch (error: any) {
      // Error ko handle karein aur ek user-friendly message return karein
      const message = error.message || "An unknown error occurred while fetching stats.";
      return rejectWithValue(message);
    }
  }
);