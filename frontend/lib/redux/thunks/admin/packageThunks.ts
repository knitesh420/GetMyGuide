import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiService } from "@/lib/service/api";
import { AdminPackage } from "@/types/admin";

// The public listing. Serves the tours pages, so it must stay unauthenticated —
// GET /package returns only `status: 'active'` packages.
export const fetchPackages = createAsyncThunk<AdminPackage[]>(
  "admin/fetchPackages",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminPackage[]>("/package");
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch packages");
    }
  },
);

/**
 * The admin listing: every package, inactive ones included.
 *
 * Separate from `fetchPackages` above rather than a flag on it, because that one
 * is dispatched by the public /tours pages — repointing it at this admin-only
 * route would 401 every anonymous visitor. The admin panel genuinely needs the
 * inactive rows: hiding a service through the public listing would drop it from
 * the admin's own table, leaving no way to switch it back on.
 */
export const fetchPackagesForAdmin = createAsyncThunk<AdminPackage[]>(
  "admin/fetchPackagesForAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<AdminPackage[]>("/package/admin/all");
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch packages");
    }
  },
);

// Deletes a package by ID
export const deletePackage = createAsyncThunk<string, string>(
  "admin/deletePackage",
  async (packageId, { rejectWithValue }) => {
    try {
      await apiService.delete(`/package/${packageId}`);
      return packageId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete package");
    }
  },
);

// Adds a new package using FormData
export const addPackage = createAsyncThunk<AdminPackage, FormData>(
  "admin/addPackage",
  async (packageData, { rejectWithValue }) => {
    try {
      const response = await apiService.post<AdminPackage>(
        "/package",
        packageData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to add new package");
    }
  },
);

// Updates a package using FormData
export const updatePackage = createAsyncThunk<
  AdminPackage,
  { id: string; packageData: FormData }
>("admin/updatePackage", async ({ id, packageData }, { rejectWithValue }) => {
  try {
    // Backend uses PATCH for partial updates
    const response = await apiService.patch<AdminPackage>(
      `/package/${id}`,
      packageData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data!;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to update package");
  }
});

export const fetchPackageById = createAsyncThunk<AdminPackage, string>(
  "packages/fetchById",
  async (packageId, { rejectWithValue }) => {
    try {
      // Backend API endpoint: GET /package/:id
      const response = await apiService.get<AdminPackage>(
        `/package/${packageId}`,
      );
      return response.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch package");
    }
  },
);

interface FetchRecommendedArgs {
  limit?: number;
}

export const fetchRecommendedPackages = createAsyncThunk<
  AdminPackage[],
  FetchRecommendedArgs | void
>("packages/fetchRecommended", async (args, { rejectWithValue }) => {
  try {
    // Backend uses featured=true query parameter for recommended packages
    const url = args?.limit
      ? `/package?featured=true&limit=${args.limit}`
      : "/package?featured=true";

    const response = await apiService.get<AdminPackage[]>(url);
    return response.data || [];
  } catch (error: any) {
    return rejectWithValue(
      error.message || "Failed to fetch recommended packages",
    );
  }
});
