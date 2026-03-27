import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";

// Define Lead interface
export interface Lead {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "other";
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

// Define the type for the data you send to the API
interface LeadData {
  fullName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  category: "tour booking" | "become a guide" | "other";
  subject: string;
  message: string;
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
      const response = await apiService.post<Lead>("/lead/contact", leadData);
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create lead");
    }
  },
);

export const fetchLeads = createAsyncThunk(
  "leads/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Lead[]>("/lead/contact?limit=1000");
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch leads");
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
      });
  },
});

export const { resetLeadState } = leadsSlice.actions;

export default leadsSlice.reducer;
