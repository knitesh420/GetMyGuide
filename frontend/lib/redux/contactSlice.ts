import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService, publicApiService } from "@/lib/service/api";

// Define Lead interface
export interface Lead {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "service" | "other";
  subject: string;
  message: string;
  serviceName?: string;
  status: string;
  createdAt: string;
}

// Define the type for the data you send to the API
interface LeadData {
  fullName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "service" | "other";
  subject: string;
  message: string;
  serviceName?: string;
}

// Define the shape of this slice's state
interface LeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Set the initial state
const initialState: LeadsState = {
  leads: [],
  loading: false,
  error: null,
  success: false,
};

// Create an async thunk for the API call
export const createLead = createAsyncThunk(
  "leads/create",
  async (leadData: LeadData, { rejectWithValue }) => {
    try {
      const response = await publicApiService.post<Lead>("/lead/contact", leadData);
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || "Failed to send message"
      );
    }
  },
);

/**
 * GET /lead/contact answers `{ inquiries, total, page, totalPages }` — this one
 * endpoint names its array `inquiries` rather than the `data` every other list
 * route uses, so read that key explicitly. Reading `.data` here returned
 * `undefined` and the admin enquiries list was permanently empty.
 */
export const fetchLeads = createAsyncThunk(
  "leads/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ inquiries: Lead[] }>(
        "/lead/contact?limit=1000",
      );
      return response.data?.inquiries ?? [];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch leads");
    }
  },
);

/** Move an enquiry through pending → reviewed → resolved. */
export const updateLeadStatus = createAsyncThunk(
  "leads/updateStatus",
  async (
    { id, status }: { id: string; status: Lead["status"] },
    { rejectWithValue },
  ) => {
    try {
      await apiService.patch(`/lead/contact/${id}/status`, { status });
      return { id, status };
    } catch (error: any) {
      return rejectWithValue(
        error?.message || "Failed to update the enquiry status",
      );
    }
  },
);

export const deleteLead = createAsyncThunk(
  "leads/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.delete(`/lead/contact/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to delete the enquiry");
    }
  },
);

// Create the slice
const leadsSlice = createSlice({
  name: "leads",
  initialState,
  reducers: {
    resetLeadState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // createLead
      .addCase(createLead.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createLead.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(createLead.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchLeads
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload;
      })
      .addCase(fetchLeads.rejected, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateLeadStatus — patch the row in place so the table doesn't have to
      // round-trip the whole list just to recolour one badge.
      .addCase(updateLeadStatus.fulfilled, (state, action) => {
        const lead = state.leads.find((l) => l._id === action.payload.id);
        if (lead) lead.status = action.payload.status;
      })
      .addCase(updateLeadStatus.rejected, (state, action: PayloadAction<any>) => {
        state.error = action.payload;
      })
      // deleteLead
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter((l) => l._id !== action.payload);
      })
      .addCase(deleteLead.rejected, (state, action: PayloadAction<any>) => {
        state.error = action.payload;
      });
  },
});

export const { resetLeadState } = leadsSlice.actions;

export default leadsSlice.reducer;
