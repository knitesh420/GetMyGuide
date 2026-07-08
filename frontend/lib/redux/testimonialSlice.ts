// store/slices/testimonialsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// --- INTERFACES ---
interface Testimonial {
  _id: string;
  name: string;
  message?: string;
  country: string;
  rating?: number;
  video?: string;
  position?: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestimonialResponse {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  data: Testimonial[];
}

interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  visible?: boolean;
}

interface TestimonialsState {
  testimonials: Testimonial[];
  currentTestimonial: Testimonial | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  toggling: boolean;
}

const initialState: TestimonialsState = {
  testimonials: [],
  currentTestimonial: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
  creating: false,
  updating: false,
  deleting: false,
  toggling: false,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to get auth token
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- FETCH TESTIMONIALS (No changes needed) ---
export const fetchTestimonials = createAsyncThunk<
  TestimonialResponse,
  QueryParams | undefined,
  { rejectValue: string }
>(
  "testimonials/fetchTestimonials",
  async (params: QueryParams = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", String(params.page || 1));
      queryParams.append("limit", String(params.limit || 10));
      if (params.search) queryParams.append("search", params.search);
      if (params.visible !== undefined)
        queryParams.append("visible", String(params.visible));

      const response = await fetch(
        `${API_BASE_URL}/testimonials?${queryParams.toString()}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(
        error?.message || "Failed to fetch testimonials"
      );
    }
  }
);

// --- CREATE TESTIMONIAL (FIXED) ---
export const createTestimonial = createAsyncThunk(
  "testimonials/createTestimonial",
  async (testimonialData: FormData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/testimonials`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          // CRITICAL: Do NOT set Content-Type for FormData
          // Browser will set it automatically with boundary
          ...getAuthHeaders(),
        },
        body: testimonialData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create testimonial');
      }

      const data = await response.json();
      console.log("✅ Testimonial created:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Create error:", error);
      return rejectWithValue(error.message || 'Failed to create testimonial');
    }
  }
);

// --- UPDATE TESTIMONIAL (FIXED) ---
export const updateTestimonial = createAsyncThunk(
  "testimonials/updateTestimonial",
  async (
    { id, testimonialData }: { id: string; testimonialData: FormData },
    { rejectWithValue }
  ) => {
    try {
      console.log("📤 Updating testimonial with FormData for ID:", id);
      console.log("FormData entries:");
      for (let pair of testimonialData.entries()) {
        if (pair[1] instanceof File) {
          console.log(`  ${pair[0]}: [File] ${pair[1].name} (${pair[1].size} bytes)`);
        } else {
          console.log(`  ${pair[0]}: ${pair[1]}`);
        }
      }

      const response = await fetch(`${API_BASE_URL}/testimonials/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          // CRITICAL: Do NOT set Content-Type for FormData
          ...getAuthHeaders(),
        },
        body: testimonialData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update testimonial');
      }

      const data = await response.json();
      console.log("✅ Testimonial updated:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Update error:", error);
      return rejectWithValue(error.message || 'Failed to update testimonial');
    }
  }
);

// --- DELETE TESTIMONIAL ---
export const deleteTestimonial = createAsyncThunk(
  "testimonials/deleteTestimonial",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/testimonials/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return { id };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete testimonial');
    }
  }
);

// --- TOGGLE VISIBILITY ---
export const toggleTestimonialVisibility = createAsyncThunk(
  "testimonials/toggleTestimonialVisibility",
  async (
    { id, isVisible }: { id: string; isVisible: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/testimonials/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ isVisible }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle visibility');
    }
  }
);

// --- SLICE DEFINITION ---
const testimonialsSlice = createSlice({
  name: "testimonials",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Testimonials
      .addCase(fetchTestimonials.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTestimonials.fulfilled, (state, action) => {
        state.loading = false;
        state.testimonials = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchTestimonials.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Testimonial
      .addCase(createTestimonial.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTestimonial.fulfilled, (state, action) => {
        state.creating = false;
        state.testimonials.unshift(action.payload.data);
        state.total += 1;
      })
      .addCase(createTestimonial.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      })
      // Update Testimonial
      .addCase(updateTestimonial.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTestimonial.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.testimonials.findIndex(t => t._id === action.payload.data._id);
        if (index !== -1) {
          state.testimonials[index] = action.payload.data;
        }
      })
      .addCase(updateTestimonial.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })
      // Delete Testimonial
      .addCase(deleteTestimonial.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteTestimonial.fulfilled, (state, action) => {
        state.deleting = false;
        state.testimonials = state.testimonials.filter(t => t._id !== action.payload.id);
        state.total -= 1;
      })
      .addCase(deleteTestimonial.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      })
      // Toggle Visibility
      .addCase(toggleTestimonialVisibility.pending, (state) => {
        state.toggling = true;
        state.error = null;
      })
      .addCase(toggleTestimonialVisibility.fulfilled, (state, action) => {
        state.toggling = false;
        const index = state.testimonials.findIndex(t => t._id === action.payload.data._id);
        if (index !== -1) {
          state.testimonials[index] = action.payload.data;
        }
      })
      .addCase(toggleTestimonialVisibility.rejected, (state, action) => {
        state.toggling = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentPage } = testimonialsSlice.actions;
export default testimonialsSlice.reducer;

// --- SELECTORS ---
export const selectAllTestimonials = (state: { testimonials: TestimonialsState }) =>
  state.testimonials;