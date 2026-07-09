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

const fallbackLocations: LocationOption[] = [
  { _id: "delhi", placeName: "Delhi" },
  { _id: "agra", placeName: "Agra" },
  { _id: "jaipur", placeName: "Jaipur" },
  { _id: "mumbai", placeName: "Mumbai" },
  { _id: "varanasi", placeName: "Varanasi" },
  { _id: "kolkata", placeName: "Kolkata" },
  { _id: "chennai", placeName: "Chennai" },
  { _id: "kochi", placeName: "Kochi" },
  { _id: "bangalore", placeName: "Bangalore" },
];

const fallbackLanguages: LanguageOption[] = [
  { _id: "english", languageName: "English" },
  { _id: "spanish", languageName: "Spanish" },
  { _id: "french", languageName: "French" },
  { _id: "german", languageName: "German" },
  { _id: "italian", languageName: "Italian" },
  { _id: "japanese", languageName: "Japanese" },
  { _id: "russian", languageName: "Russian" },
  { _id: "chinese", languageName: "Chinese" },
  { _id: "arabic", languageName: "Arabic" },
];

const locationNameById = new Map(
  fallbackLocations.map((location) => [location._id, location.placeName]),
);
const languageNameById = new Map(
  fallbackLanguages.map((language) => [language._id, language.languageName]),
);

export const fetchCustomTourFormData = createAsyncThunk<FormDataPayload>(
  "customTour/fetchFormData",
  async (_, { rejectWithValue }) => {
    try {
      return {
        locations: fallbackLocations,
        languages: fallbackLanguages,
      };
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const submitCustomTourRequest = createAsyncThunk(
  "customTour/submit",
  async (requestData: SubmitPayload, { rejectWithValue }) => {
    try {
      const selectedLocations = requestData.selectedLocations
        .map((id) => locationNameById.get(id) || id)
        .join(", ");
      const selectedLanguage =
        languageNameById.get(requestData.selectedLanguage) ||
        requestData.selectedLanguage ||
        "No preference";
      const from = requestData.dateRange.from
        ? requestData.dateRange.from.toLocaleDateString()
        : "Flexible";
      const to = requestData.dateRange.to
        ? requestData.dateRange.to.toLocaleDateString()
        : "Flexible";

      const response = await apiService.post("/lead/contact", {
        fullName: requestData.fullName,
        email: requestData.email,
        phoneNumber: requestData.phone,
        nationality: "Not provided",
        category: "tour booking",
        serviceName: "Custom tour request",
        subject: "Custom tour request",
        message: [
          `Locations: ${selectedLocations || "Flexible"}`,
          `Preferred language: ${selectedLanguage}`,
          `Travel dates: ${from} - ${to}`,
          `Travelers: ${requestData.numTravelers}`,
          `Preferred monuments: ${requestData.preferredMonuments || "None"}`,
          `Needs stay: ${requestData.needsStay ? "Yes" : "No"}`,
          `Needs lunch: ${requestData.needsLunch ? "Yes" : "No"}`,
          `Needs dinner: ${requestData.needsDinner ? "Yes" : "No"}`,
          `Acknowledged inquiry terms: ${requestData.acknowledged ? "Yes" : "No"}`,
        ].join("\n"),
      });
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
      return [];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);

export const fetchCustomTourRequestById = createAsyncThunk(
  "customTour/fetchById",
  async (requestId: string, { rejectWithValue }) => {
    try {
      void requestId;
      return null;
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
        `/lead/contact/${requestId}/status`,
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
      return requestId;
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
export const fetchMyCustomRequests = createAsyncThunk(
  "customTour/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      return [];
    } catch (error: any) {
      return handleThunkError(error, rejectWithValue);
    }
  }
);
