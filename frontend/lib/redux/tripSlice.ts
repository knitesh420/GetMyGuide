import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Trip } from "@/lib/data";
import {
  cancelTrip,
  completeTrip,
  fetchAllTrips,
  fetchMyTrips,
  fetchMyTripsAsTourist,
  fetchTripById,
  startTrip,
} from "@/lib/redux/thunks/trip/tripThunks";

interface TripState {
  trips: Trip[];
  myTrips: Trip[];
  currentTrip: Trip | null;
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; totalPages: number };
}

const initialState: TripState = {
  trips: [],
  myTrips: [],
  currentTrip: null,
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
};

function upsert(list: Trip[], updated: Trip) {
  const index = list.findIndex((t) => t._id === updated._id);
  if (index !== -1) list[index] = updated;
}

const tripSlice = createSlice({
  name: "trip",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchMyTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.myTrips = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchMyTripsAsTourist.fulfilled, (state, action) => {
        state.loading = false;
        state.myTrips = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchTripById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTrip = action.payload;
      })
      .addCase(startTrip.fulfilled, (state, action) => {
        state.loading = false;
        upsert(state.myTrips, action.payload);
        upsert(state.trips, action.payload);
        if (state.currentTrip?._id === action.payload._id) state.currentTrip = action.payload;
      })
      .addCase(completeTrip.fulfilled, (state, action) => {
        state.loading = false;
        upsert(state.myTrips, action.payload);
        upsert(state.trips, action.payload);
        if (state.currentTrip?._id === action.payload._id) state.currentTrip = action.payload;
      })
      .addCase(cancelTrip.fulfilled, (state, action) => {
        state.loading = false;
        upsert(state.trips, action.payload);
        if (state.currentTrip?._id === action.payload._id) state.currentTrip = action.payload;
      })
      .addMatcher(
        (action) => action.type.startsWith("trip/") && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.startsWith("trip/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export default tripSlice.reducer;
