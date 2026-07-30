import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getAdvertisements,
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  toggleAdvertisementActive,
  deleteAdvertisement,
  Advertisement,
} from "@/lib/service/advertisementService";

interface AdvertisementState {
  advertisements: Advertisement[];
  allAdvertisements: Advertisement[];
  loading: boolean;
  error: string | null;
  selectedAdvertisement: Advertisement | null;
}

const initialState: AdvertisementState = {
  advertisements: [],
  allAdvertisements: [],
  loading: false,
  error: null,
  selectedAdvertisement: null,
};

// Async thunks
export const fetchAdvertisements = createAsyncThunk<Advertisement[]>(
  "advertisement/fetchAdvertisements",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAdvertisements();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch advertisements");
    }
  },
);

export const fetchAllAdvertisements = createAsyncThunk<Advertisement[]>(
  "advertisement/fetchAllAdvertisements",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAllAdvertisements();
      return data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch all advertisements",
      );
    }
  },
);

export const fetchAdvertisementById = createAsyncThunk<
  Advertisement | null,
  string
>("advertisement/fetchById", async (id, { rejectWithValue }) => {
  try {
    const data = await getAdvertisementById(id);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch advertisement");
  }
});

export const createNewAdvertisement = createAsyncThunk<Advertisement, FormData>(
  "advertisement/create",
  async (formData, { rejectWithValue }) => {
    try {
      const data = await createAdvertisement(formData);
      if (!data) throw new Error("Failed to create advertisement");
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create advertisement");
    }
  },
);

export const updateAdvertisementData = createAsyncThunk<
  Advertisement,
  { id: string; formData: FormData }
>("advertisement/update", async ({ id, formData }, { rejectWithValue }) => {
  try {
    const data = await updateAdvertisement(id, formData);
    if (!data) throw new Error("Failed to update advertisement");
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to update advertisement");
  }
});

export const toggleAdvertisement = createAsyncThunk<Advertisement, string>(
  "advertisement/toggle",
  async (id, { rejectWithValue }) => {
    try {
      const data = await toggleAdvertisementActive(id);
      if (!data) throw new Error("Failed to toggle advertisement");
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to toggle advertisement");
    }
  },
);

export const deleteAdvertisementData = createAsyncThunk<string, string>(
  "advertisement/delete",
  async (id, { rejectWithValue }) => {
    try {
      const success = await deleteAdvertisement(id);
      if (success) {
        return id;
      }
      throw new Error("Delete failed");
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete advertisement");
    }
  },
);

const advertisementSlice = createSlice({
  name: "advertisement",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedAdvertisement: (state) => {
      state.selectedAdvertisement = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch advertisements
    builder
      .addCase(fetchAdvertisements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdvertisements.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisements = action.payload;
      })
      .addCase(fetchAdvertisements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch all advertisements
    builder
      .addCase(fetchAllAdvertisements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllAdvertisements.fulfilled, (state, action) => {
        state.loading = false;
        state.allAdvertisements = action.payload;
      })
      .addCase(fetchAllAdvertisements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchAdvertisementById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdvertisementById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedAdvertisement = action.payload;
      })
      .addCase(fetchAdvertisementById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createNewAdvertisement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewAdvertisement.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisements.push(action.payload);
        state.allAdvertisements.push(action.payload);
      })
      .addCase(createNewAdvertisement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateAdvertisementData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAdvertisementData.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.advertisements.findIndex(
          (ad) => ad.id === action.payload.id,
        );
        if (index !== -1) {
          state.advertisements[index] = action.payload;
        }
        const allIndex = state.allAdvertisements.findIndex(
          (ad) => ad.id === action.payload.id,
        );
        if (allIndex !== -1) {
          state.allAdvertisements[allIndex] = action.payload;
        }
      })
      .addCase(updateAdvertisementData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Toggle
    builder
      .addCase(toggleAdvertisement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleAdvertisement.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.allAdvertisements.findIndex(
          (ad) => ad.id === action.payload.id,
        );
        if (index !== -1) {
          state.allAdvertisements[index] = action.payload;
        }
        const pubIndex = state.advertisements.findIndex(
          (ad) => ad.id === action.payload.id,
        );
        if (pubIndex !== -1 && action.payload.isActive) {
          state.advertisements[pubIndex] = action.payload;
        } else if (pubIndex !== -1) {
          state.advertisements.splice(pubIndex, 1);
        }
      })
      .addCase(toggleAdvertisement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteAdvertisementData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAdvertisementData.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.advertisements = state.advertisements.filter(
          (ad) => ad.id !== deletedId,
        );
        state.allAdvertisements = state.allAdvertisements.filter(
          (ad) => ad.id !== deletedId,
        );
        if (state.selectedAdvertisement?.id === deletedId) {
          state.selectedAdvertisement = null;
        }
      })
      .addCase(deleteAdvertisementData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedAdvertisement } =
  advertisementSlice.actions;
export default advertisementSlice.reducer;
