// lib/redux/guides/guide.slice.ts
import { createSlice, PayloadAction  } from "@reduxjs/toolkit";
import { GuideState, GuideProfile, tourGuideBooking } from "@/lib/data"; // Assuming GuideProfile is the type
import {
  getMyGuideProfile,
  updateMyGuideProfile,
  getAllGuides,
  getGuideById,
  toggleGuideApproval,
  deleteGuide,
  updateMyAvailability,
  fetchGuidePricingDetails ,
  adminGetAllGuides,
  fetchMyBookingsThunk,
  fetchGuidesForTour
} from "@/lib/redux/thunks/guide/guideThunk";

const initialState: GuideState = {
  guides: [],
  tourGuideBooking: [],
  currentGuide: null,
  myProfile: null,
  loading: false,
  error: null,
  pricingDetails: null,
  pricingLoading: false,
  pagination: { total: 0, page: 1, totalPages: 0 },
  
};

const guideSlice = createSlice({
  name: "guide",
  initialState,
  reducers: {
    clearGuideError: (state) => {
      state.error = null;
    },
    clearGuides: (state) => {
      state.guides = [];
      state.pagination = { total: 0, page: 1, totalPages: 0 };
    },
  },
  extraReducers: (builder) => {
    const setPending = (state: GuideState) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state: GuideState, action: any) => {
      state.loading = false;
      state.error = action.payload as string;
    };

    builder
      // Handle Get My Profile
      .addCase(getMyGuideProfile.pending, setPending)
      .addCase(getMyGuideProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(getMyGuideProfile.rejected, setRejected)

      // Handle Update My Profile
      .addCase(updateMyGuideProfile.pending, setPending)
      .addCase(updateMyGuideProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(updateMyGuideProfile.rejected, setRejected)
      
      // Handle Get All Guides
      .addCase(getAllGuides.pending, setPending)
      .addCase(getAllGuides.fulfilled, (state, action) => {
        state.loading = false;
        // This thunk replaces the entire guides array
        state.guides = action.payload.data; 
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(getAllGuides.rejected, setRejected)
      
      .addCase(adminGetAllGuides.pending, setPending)
      .addCase(adminGetAllGuides.fulfilled, (state, action) => {
        state.loading = false;
        // This thunk replaces the entire guides array
        state.guides = action.payload.data; 
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(adminGetAllGuides.rejected, setRejected)

      // Handle Fetch My Bookings
      .addCase(fetchMyBookingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyBookingsThunk.fulfilled,
        (state, action: PayloadAction<tourGuideBooking[]>) => { // This now works
          state.loading = false;
          state.tourGuideBooking = action.payload;
        }
      )
      .addCase(fetchMyBookingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })


      builder
      .addCase(fetchGuidePricingDetails.pending, (state) => {
        state.pricingLoading = true;
      })
      .addCase(fetchGuidePricingDetails.fulfilled, (state, action) => {
        state.pricingLoading = false;
        state.pricingDetails = action.payload;
      })
      .addCase(fetchGuidePricingDetails.rejected, (state) => {
        state.pricingLoading = false;
        state.pricingDetails = null;
      })

      // Handle Get Guide By ID --- THIS IS THE CORRECTED BLOCK ---
      .addCase(getGuideById.pending, setPending)
      .addCase(getGuideById.fulfilled, (state, action) => {
        state.loading = false;
        const fetchedGuide = action.payload as GuideProfile; // The payload IS the guide object

        // 1. Set currentGuide (keeps original functionality)
        state.currentGuide = fetchedGuide;

        // 2. IMPORTANT: Add the guide to the 'guides' array so the checkout page can find it.
        const existingGuideIndex = state.guides.findIndex(g => g._id === fetchedGuide._id);

        if (existingGuideIndex === -1) {
          // If it doesn't exist, add it.
          state.guides.push(fetchedGuide);
        } else {
          // If it exists (e.g., from a previous getAllGuides call), update it with the fresh data.
          state.guides[existingGuideIndex] = fetchedGuide;
        }
      })
      .addCase(getGuideById.rejected, setRejected)
      

      // Handle Toggle Approval
      .addCase(toggleGuideApproval.pending, setPending)
      .addCase(toggleGuideApproval.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.guides.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) state.guides[index] = action.payload;
        if (state.currentGuide?._id === action.payload._id) {
          state.currentGuide = action.payload;
        }
      })
      .addCase(toggleGuideApproval.rejected, setRejected)

      // Handle Delete Guide
      .addCase(deleteGuide.pending, setPending)
      .addCase(deleteGuide.fulfilled, (state, action) => {
        state.loading = false;
        state.guides = state.guides.filter((g) => g._id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(deleteGuide.rejected, setRejected)

      // Handle Update Availability
      .addCase(updateMyAvailability.pending, setPending)
      .addCase(updateMyAvailability.fulfilled, (state, action) => {
        state.loading = false;
        if (state.myProfile) {
          state.myProfile = action.payload;
        }
      })
      .addCase(updateMyAvailability.rejected, setRejected)
      .addCase(fetchGuidesForTour.pending, setPending)
      .addCase(fetchGuidesForTour.fulfilled, (state, action) => {
        state.loading = false;
        state.guides = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchGuidesForTour.rejected, setRejected);
  },
});

export const { clearGuideError, clearGuides } = guideSlice.actions;
export default guideSlice.reducer;