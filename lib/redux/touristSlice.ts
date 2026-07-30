import { createSlice } from "@reduxjs/toolkit";
import { TouristState } from "@/lib/data";
import { getMyTouristProfile, updateMyTouristProfile } from "@/lib/redux/thunks/tourist/touristThunk";

const initialState: TouristState = {
  myProfile: null,
  loading: false,
  error: null,
};

const touristSlice = createSlice({
  name: "tourist",
  initialState,
  reducers: {
    clearTouristError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setPending = (state: TouristState) => {
      state.loading = true;
      state.error = null;
    };
    const setRejected = (state: TouristState, action: any) => {
      state.loading = false;
      state.error = action.payload as string;
    };

    builder
      .addCase(getMyTouristProfile.pending, setPending)
      .addCase(getMyTouristProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(getMyTouristProfile.rejected, setRejected)

      .addCase(updateMyTouristProfile.pending, setPending)
      .addCase(updateMyTouristProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(updateMyTouristProfile.rejected, setRejected);
  },
});

export const { clearTouristError } = touristSlice.actions;
export default touristSlice.reducer;
