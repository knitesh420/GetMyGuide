import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";

interface LocationOption {
  _id: string;
  placeName: string;
}

interface LanguageOption {
  _id: string;
  languageName: string;
}

interface FormDataPayload {
  locations: LocationOption[];
  languages: LanguageOption[];
}

interface SubmitPayload {
  fullName: string;
  email: string;
  phone: string;
  selectedLocations: string[];
  selectedLanguage: string;
  dateRange: { from: Date | null; to: Date | null };
  numTravelers: number;
  preferredMonuments: string;
  needsLunch: boolean;
  needsDinner: boolean;
  needsStay: boolean;
  acknowledged: boolean;
}

interface UpdateStatusPayload {
  requestId: string;
  status: string;
  quoteAmount?: number;
  adminComment?: string;
}

const handleThunkError = (error: any, rejectWithValue: Function) => {
  const message = error.message || "An unknown error occurred";
  return rejectWithValue(message);
};

export const fetchCustomTourFormData = createAsyncThunk<FormDataPayload>(
  "customTour/fetchFormData",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<FormDataPayload>(
        "/api/custom-tour-requests/form-data"
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch form data");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const submitCustomTourRequest = createAsyncThunk(
  "customTour/submit",
  async (requestData: SubmitPayload, { rejectWithValue }) => {
    try {
      const response = await apiService.post(
        "/api/custom-tour-requests",
        requestData
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to submit request");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const fetchAllCustomTourRequests = createAsyncThunk(
  "customTour/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get("/api/custom-tour-requests");
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch requests");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const fetchCustomTourRequestById = createAsyncThunk(
  "customTour/fetchById",
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.get(
        `/api/custom-tour-requests/${requestId}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch request details");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);


export const updateCustomTourRequestStatus = createAsyncThunk(
  "customTour/updateStatus",
  async (
    { requestId, status, quoteAmount, adminComment }: UpdateStatusPayload,
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.patch(
        `/api/custom-tour-requests/${requestId}/status`,
        { status, quoteAmount, adminComment }
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || "Failed to update status");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const deleteCustomTourRequest = createAsyncThunk(
  "customTour/delete",
  async (requestId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.delete(
        `/api/custom-tour-requests/${requestId}`
      );
      if (response.success) {
        return requestId;
      }
      throw new Error(response.message || "Failed to delete request");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
export const fetchMyCustomRequests = createAsyncThunk(
  "customTour/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get("/api/custom-tour-requests/my-requests");
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Failed to fetch your requests");
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);