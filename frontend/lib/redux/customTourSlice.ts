import { createSlice } from "@reduxjs/toolkit";
import {
  fetchCustomTourFormData,
  submitCustomTourRequest,
  fetchAllCustomTourRequests,
  fetchMyCustomRequests,
  fetchCustomTourRequestById,
  updateCustomTourRequestStatus,
  deleteCustomTourRequest,
} from "./thunks/customTour/customTourThunks";

interface LocationOption {
  _id: string;
  placeName: string;
}
interface LanguageOption {
  _id: string;
  languageName: string;
}

interface CustomTourState {
  locations: LocationOption[];
  languages: LanguageOption[];
  formLoading: boolean;
  formError: string | null;
  submitLoading: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  allRequests: any[];
  currentRequest: any | null;
  listLoading: boolean;
  listError: string | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialState: CustomTourState = {
  locations: [],
  languages: [],
  formLoading: false,
  formError: null,
  submitLoading: false,
  submitSuccess: false,
  submitError: null,
  allRequests: [],
  currentRequest: null,
  listLoading: false,
  listError: null,
  detailLoading: false,
  detailError: null,
};

const customTourSlice = createSlice({
  name: "customTour",
  initialState,
  reducers: {
    resetFormStatus: (state) => {
      state.submitLoading = false;
      state.submitSuccess = false;
      state.submitError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomTourFormData.pending, (state) => {
        state.formLoading = true;
        state.formError = null;
      })
      .addCase(fetchCustomTourFormData.fulfilled, (state, action) => {
        state.formLoading = false;
        state.locations = action.payload.locations;
        state.languages = action.payload.languages;
      })
      .addCase(fetchCustomTourFormData.rejected, (state, action) => {
        state.formLoading = false;
        state.formError = action.payload as string;
      })
      .addCase(submitCustomTourRequest.pending, (state) => {
        state.submitLoading = true;
        state.submitSuccess = false;
        state.submitError = null;
      })
      .addCase(submitCustomTourRequest.fulfilled, (state) => {
        state.submitLoading = false;
        state.submitSuccess = true;
      })
      .addCase(submitCustomTourRequest.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload as string;
      })
      .addCase(fetchAllCustomTourRequests.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchAllCustomTourRequests.fulfilled, (state, action) => {
        state.listLoading = false;
        state.allRequests = action.payload;
      })
      .addCase(fetchAllCustomTourRequests.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload as string;
      })
      .addCase(fetchMyCustomRequests.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchMyCustomRequests.fulfilled, (state, action) => {
        state.listLoading = false;
        state.allRequests = action.payload;
      })
      .addCase(fetchMyCustomRequests.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload as string;
      })
      .addCase(fetchCustomTourRequestById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.currentRequest = null;
      })
      .addCase(fetchCustomTourRequestById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchCustomTourRequestById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload as string;
      })
      .addCase(updateCustomTourRequestStatus.fulfilled, (state, action) => {
        const updatedRequest = action.payload;
        state.allRequests = state.allRequests.map((req) =>
          req._id === updatedRequest._id ? updatedRequest : req
        );
        if (state.currentRequest?._id === updatedRequest._id) {
          state.currentRequest = updatedRequest;
        }
      })
      .addCase(deleteCustomTourRequest.fulfilled, (state, action) => {
        state.allRequests = state.allRequests.filter(
          (req) => req._id !== action.payload
        );
      });
  },
});

export const { resetFormStatus } = customTourSlice.actions;
export default customTourSlice.reducer;
