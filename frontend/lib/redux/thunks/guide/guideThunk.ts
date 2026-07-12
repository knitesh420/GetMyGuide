import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { GuideProfile } from "@/lib/data";
import { AdminLocation, LanguageOption } from '@/lib/data';
import { tourGuideBooking } from '@/lib/data';
import { GuideCalendar, GuideLeave, GuideLeaveType } from '@/lib/data';

const handleError = (err: any) =>
  err.response?.data?.message || err.message || "An error occurred";


export const fetchGuidesForTour = createAsyncThunk<
  { data: GuideProfile[]; total: number; page: number; totalPages: number },
  { tourId: string; startDate: string; endDate: string; language?: string; page?: number; limit?: number }
>("guide/fetchGuidesForTour", async (params, { rejectWithValue }) => {
  try {
    // The backend has no dedicated /guides/for-tour endpoint. Approved,
    // currently-visible guides are served by /guides/all. Date-range
    // availability filtering is not implemented server-side, so we list the
    // approved guides and let the traveller pick. The "all" language sentinel
    // must be omitted, otherwise the backend regex-matches a literal "all".
    const query: Record<string, string | number> = {};
    if (params.language && params.language !== "all") query.language = params.language;
    if (params.page) query.page = params.page;
    if (params.limit) query.limit = params.limit;

    const response = await apiService.get<{
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    }>("/guides/all", { params: query });
    return response as unknown as {
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    };
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});



// Get own guide profile
export const getMyGuideProfile = createAsyncThunk<GuideProfile, void>(
  "guide/getMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      // The backend's Respond() spreads the payload onto the top level of the
      // body ({ ...profile, success }), so the profile fields are on `response`
      // itself, not `response.data`.
      const response = await apiService.get<GuideProfile>("/guides/profile");
      return response as unknown as GuideProfile;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// One-time guide registration — full profile + KYC files, multipart
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
      return response as unknown as GuideProfile;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * The only fields a guide may edit once registered. The backend rejects any
 * other key outright, and rejects the request entirely until registration is
 * complete.
 */
export interface GuideProfilePatch {
  phone?: string;
  city?: string;
  type?: "normal" | "escort";
  languages?: string[];
}

export const patchMyGuideProfile = createAsyncThunk<GuideProfile, GuideProfilePatch>(
  "guide/patchMyProfile",
  async (patch, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<GuideProfile>("/guides/profile", patch);
      return response as unknown as GuideProfile;
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
    // Respond() spreads { transaction_id, razorpay_options } onto the top level.
    return response as unknown as {
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
    };
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
    // Respond() spreads { message, guide } onto the top level.
    return (response as unknown as { guide: GuideProfile }).guide;
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

    return response as unknown as {
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    };
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

    return response as unknown as {
      data: GuideProfile[];
      total: number;
      page: number;
      totalPages: number;
    };
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
      return response as unknown as GuideProfile;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// ---- Admin KYC review -----------------------------------------------------
// Approving and rejecting are separate endpoints, not one toggle: a rejection
// carries a reason the guide is shown verbatim, and there is nothing to "toggle
// off" about an approval — you reject instead.

export const approveGuide = createAsyncThunk<GuideProfile, string>(
  "guide/approve",
  async (guideAccountId, { rejectWithValue }) => {
    try {
      const response = await apiService.patch<GuideProfile>(
        `/guides/${guideAccountId}/approve`,
      );
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export const rejectGuide = createAsyncThunk<
  GuideProfile,
  { guideAccountId: string; reason: string }
>("guide/reject", async ({ guideAccountId, reason }, { rejectWithValue }) => {
  try {
    const response = await apiService.patch<GuideProfile>(
      `/guides/${guideAccountId}/reject`,
      { reason },
    );
    return response.data!;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export interface PendingApproval {
  accountId: string;
  guideCode: string | null;
  name: string;
  email: string;
  phone: string;
  city: string;
  type: string;
  languages: string[];
  pan: string;
  profileImage: string;
  /** [licence, aadhaar] in upload order — this is what the admin reviews. */
  identityProofs: string[];
  submittedAt: string;
}

export const fetchPendingApprovals = createAsyncThunk<PendingApproval[], void>(
  "guide/fetchPendingApprovals",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<PendingApproval[]>(
        "/guides/admin/pending-approvals",
      );
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

// ---- The guide's own rates & payout destination ---------------------------

export interface GuidePricing {
  halfDay: number;
  fullDay: number;
}

export const updateMyPricing = createAsyncThunk<GuidePricing, GuidePricing>(
  "guide/updatePricing",
  async (pricing, { rejectWithValue }) => {
    try {
      const response = await apiService.put<GuidePricing>("/guides/pricing", pricing);
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

export interface GuideBankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
}

export const updateMyBankDetails = createAsyncThunk<GuideBankDetails, GuideBankDetails>(
  "guide/updateBankDetails",
  async (bankDetails, { rejectWithValue }) => {
    try {
      const response = await apiService.put<GuideBankDetails>(
        "/guides/bank-details",
        bankDetails,
      );
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

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
    return response as unknown as GuideProfile;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

export interface GuidePricingDetails {
  guideId: string;
  name: string;
  currency: string;
  pricing: GuidePricing | null;
  isCertified: boolean;
  /** False when the guide is unverified or has never published rates. */
  bookable: boolean;
  /** Why not, so the page can say something better than "unavailable". */
  unavailableReason: string | null;
}

/** What this guide charges. Drives the direct-booking page's price summary. */
export const fetchGuidePricingDetails = createAsyncThunk<GuidePricingDetails, string>(
  "guide/fetchPricingDetails",
  async (guideId, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuidePricingDetails>(
        `/guides/${guideId}/pricing-details`,
      );
      return response.data!;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  },
);

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

// --- Guide Availability & Booking Conflict System ---

// Create a vacation/emergency leave period for the current guide
export const createMyLeave = createAsyncThunk<
  GuideLeave,
  { type: GuideLeaveType; startDate: string; endDate: string; reason?: string }
>("guide/createMyLeave", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiService.post<GuideLeave>("/guide-availability/leave", payload);
    return response as unknown as GuideLeave;
  } catch (err: any) {
    return rejectWithValue(handleError(err));
  }
});

// List the current guide's own leaves (vacation/emergency)
export const fetchMyLeaves = createAsyncThunk<GuideLeave[], void>(
  "guide/fetchMyLeaves",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuideLeave[]>("/guide-availability/leave/my");
      return response.data ?? [];
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Cancel a future leave belonging to the current guide — the record is kept
// (status flips to 'cancelled') rather than deleted, so it stays visible in
// the guide's leave history.
export const cancelMyLeave = createAsyncThunk<GuideLeave, string>(
  "guide/cancelMyLeave",
  async (leaveId, { rejectWithValue }) => {
    try {
      const response = await apiService.delete<GuideLeave>(`/guide-availability/leave/${leaveId}`);
      return response as unknown as GuideLeave;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);

// Merged calendar for the current guide: unavailable dates + leaves + booked ranges
export const fetchMyGuideCalendar = createAsyncThunk<GuideCalendar, void>(
  "guide/fetchMyCalendar",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<GuideCalendar>("/guide-availability/calendar/me");
      return response as unknown as GuideCalendar;
    } catch (err: any) {
      return rejectWithValue(handleError(err));
    }
  }
);