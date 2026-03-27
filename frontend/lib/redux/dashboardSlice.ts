import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchDashboardStats } from "./thunks/dashboard/dashboardThunks";

// Dashboard state ka structure define karein
interface DashboardState {
  stats: any | null; // API se aane wala data yahan store hoga
  loading: boolean;  // Data fetch ho raha hai ya nahi, yeh track karne ke liye
  error: string | null; // Agar koi error aaye, to use yahan store karne ke liye
}

// Initial state
const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    // Yahan aap normal reducers add kar sakte hain, agar zaroorat pade
    // Jaise, dashboard ko reset karne ke liye:
    // resetDashboard: (state) => {
    //   state.stats = null;
    //   state.loading = false;
    //   state.error = null;
    // }
  },
  // extraReducers async thunks dwara dispatch kiye gaye actions ko handle karte hain
  extraReducers: (builder) => {
    builder
      // Jab data fetch karna shuru ho (pending state)
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null; // Purana error clear kar dein
      })
      // Jab data successfully fetch ho jaaye (fulfilled state)
      .addCase(fetchDashboardStats.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.stats = action.payload; // Fetched data ko state mein save karein
      })
      // Jab data fetch karne mein error aaye (rejected state)
      .addCase(fetchDashboardStats.rejected, (state, action: PayloadAction<unknown>) => {
        state.loading = false;
        state.error = action.payload as string; // Error message ko state mein save karein
      });
  },
});

// Agar aapne koi reducer banaya hai to use yahan se export karein
// export const { resetDashboard } = dashboardSlice.actions;

export default dashboardSlice.reducer;