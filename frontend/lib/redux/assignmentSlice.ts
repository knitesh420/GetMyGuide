import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdminBookingSummary, AssignableGuide, Assignment } from "@/lib/data";
import {
  createAssignment,
  fetchAssignableGuides,
  fetchAssignments,
  fetchBookingsAwaitingAssignment,
  fetchMyAssignments,
  reassignGuide,
  respondToAssignment,
} from "@/lib/redux/thunks/assignment/assignmentThunks";

interface AssignmentState {
  assignments: Assignment[];
  myAssignments: Assignment[];
  assignableGuides: AssignableGuide[];
  bookingsAwaitingAssignment: AdminBookingSummary[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; totalPages: number };
}

const initialState: AssignmentState = {
  assignments: [],
  myAssignments: [],
  assignableGuides: [],
  bookingsAwaitingAssignment: [],
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, totalPages: 0 },
};

const assignmentSlice = createSlice({
  name: "assignment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action) => {
        state.loading = false;
        state.myAssignments = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchAssignableGuides.fulfilled, (state, action) => {
        state.loading = false;
        state.assignableGuides = action.payload;
      })
      .addCase(fetchBookingsAwaitingAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingsAwaitingAssignment = action.payload;
      })
      .addCase(createAssignment.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = [action.payload, ...state.assignments];
      })
      .addCase(reassignGuide.fulfilled, (state, action) => {
        state.loading = false;
        state.assignments = [action.payload, ...state.assignments];
      })
      .addCase(respondToAssignment.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.assignment;
        const myIndex = state.myAssignments.findIndex((a) => a._id === updated._id);
        if (myIndex !== -1) state.myAssignments[myIndex] = updated;
        const allIndex = state.assignments.findIndex((a) => a._id === updated._id);
        if (allIndex !== -1) state.assignments[allIndex] = updated;
      })
      .addMatcher(
        (action) => action.type.startsWith("assignment/") && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is PayloadAction<string> =>
          action.type.startsWith("assignment/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        },
      );
  },
});

export default assignmentSlice.reducer;
