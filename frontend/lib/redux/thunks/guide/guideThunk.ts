import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { GuideProfile } from "@/lib/data";
import { AdminLocation, LanguageOption } from '@/lib/data';
import { tourGuideBooking } from '@/lib/data';

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";


export const fetchGuidesForTour = createAsyncThunk<
  { data: GuideProfile[]; total: number; page: number; totalPages: number },
  { tourId: string; startDate: string; endDate: string; language?: string; page?: number; limit?: number }
>("guide/fetchGuidesForTour", async (params, { rejectWithValue }) => {
  try {
    const response = await apiService.get<{
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    }>("/guides/for-tour", { params });
    return response;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});



// Get own guide profile
export const getMyGuideProfile = createAsyncThunk<GuideProfile, void>(
  "guide/getMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuideProfile>("/guides/profile");
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Update own guide profile
export const updateMyGuideProfile = createAsyncThunk<GuideProfile, FormData>(
  "guide/updateMyProfile",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await apiService.put<GuideProfile>(
        "/guides/profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Guide membership (30-day recurring) — create a Razorpay order
export const createGuideMembershipOrder = createAsyncThunk<
  {
    transaction_id: string;
    razorpay_options: {
      description: string;
      currency: string;
      amount: number;
      name: string;
      order_id: string;
      prefill: { name: string; contact: string; email: string };
      key: string;
    };
  },
  void
>("guide/createMembershipOrder", async (_, { rejectWithValue }) => {
  try {
    const response = await apiService.post(
      "/guides/membership/create-order",
      undefined,
      { headers: { "x-idempotency-key": crypto.randomUUID() } },
    );
    return response.data;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// Guide membership — confirm payment after Razorpay checkout succeeds.
// Serves both the very first payment and every future renewal.
export const confirmGuideMembershipPayment = createAsyncThunk<
  GuideProfile,
  {
    transaction_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
>("guide/confirmMembershipPayment", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post(
      "/guides/membership/confirm-payment",
      payload,
    );
    return response.data?.guide;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// Get all guides admin
export const adminGetAllGuides = createAsyncThunk<
  { data: GuideProfile[]; total: number; page: number; totalPages: number },
  { location?: string; language?:string; page?: number; limit?: number; search?: string; approved?: boolean } | undefined
>("guide/adminGetAllGuides", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<{
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    }>("/guides/all-guides", { params });

    return response;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export const getAllGuides = createAsyncThunk<
  { data: GuideProfile[]; total: number; page: number; totalPages: number },
  { location?: string; language?:string; page?: number; limit?: number; search?: string; approved?: boolean } | undefined
>("guide/getAllGuides", async (params = {}, { rejectWithValue }) => {
  try {
    const response = await apiService.get<{
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    }>("/guides/all", { params });

    return response;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// Get guide by ID
export const getGuideById = createAsyncThunk<GuideProfile, string>(
  "guide/getGuideById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuideProfile>(`/guides/${id}`);
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Toggle guide approval
export const toggleGuideApproval = createAsyncThunk<
  GuideProfile,
  { id: string; isApproved: boolean }
>("guide/toggleApproval", async ({ id, isApproved }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<GuideProfile>(
      `/guides/${id}/approve`,
      { isApproved }
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// Delete guide
export const deleteGuide = createAsyncThunk<string, string>(
  "guide/deleteGuide",
  async (id, { rejectWithValue }) => {
    try {
      await apiService.delete(`/guides/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Update availability
export const updateMyAvailability = createAsyncThunk<
  GuideProfile,
  { unavailableDates: string[] }
>("guide/updateMyAvailability", async ({ unavailableDates }, { rejectWithValue }) => {
  try {
    const response = await apiService.put<GuideProfile>(
      "/guides/availability",
      { unavailableDates }
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// ✅ FIXED: Fetch guide pricing details
export const fetchGuidePricingDetails = createAsyncThunk<
  { locations: AdminLocation[]; languages: LanguageOption[] },
  string
>("guide/fetchPricingDetails", async (guideId, { rejectWithValue }) => {
  try {
    console.log("🔍 Fetching pricing details for guide:", guideId);
    
    // The API interceptor returns response.data from axios
    // which gives us: { success: true, data: { locations: [...], languages: [...] } }
    const response = await apiService.get<{
      data: { locations: AdminLocation[]; languages: LanguageOption[] } 
    }>(`/guides/${guideId}/pricing-details`);
    
    console.log("📦 Full response from API:", response);
    console.log("📊 response.data (the nested data):", response.data);
    
    // Access the nested 'data' property which contains locations and languages
    if (!response.data) {
      throw new Error("No data received from API");
    }
    
    const pricingData = response.data;
    
    console.log("✅ Extracted pricing data:", pricingData);
    console.log("📍 Locations count:", pricingData.locations?.length || 0);
    console.log("🗣️ Languages count:", pricingData.languages?.length || 0);
    
    return pricingData;
  } catch (err: any) {
    console.error("❌ Error fetching pricing details:", err);
    return rejectWithValue(handleError(err));
  }
});

export const fetchMyBookingsThunk = createAsyncThunk<tourGuideBooking[]>(
  'guideBookings/fetchMyBookings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/guides/my-bookings');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);