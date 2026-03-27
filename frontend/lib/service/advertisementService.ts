import { apiService } from "@/lib/service/api";

export interface Advertisement {
  id: string;
  videoFilename: string;
  views: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementResponse {
  success: boolean;
  message: string;
  data?: Advertisement[] | Advertisement;
  advertisements?: Advertisement[];
}

// Fetch active advertisements
export async function getAdvertisements(): Promise<Advertisement[]> {
  try {
    const response =
      await apiService.get<AdvertisementResponse>("/advertisement");
    if (response?.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    return [];
  }
}

// Fetch all advertisements (admin only)
export async function getAllAdvertisements(): Promise<Advertisement[]> {
  try {
    const response = await apiService.get<AdvertisementResponse>(
      "/advertisement/admin/all",
    );
    if (response?.success && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching all advertisements:", error);
    return [];
  }
}

// Get single advertisement by ID
export async function getAdvertisementById(
  id: string,
): Promise<Advertisement | null> {
  try {
    const response = await apiService.get<AdvertisementResponse>(
      `/advertisement/${id}`,
    );
    if (response?.success && response.data && !Array.isArray(response.data)) {
      return response.data as Advertisement;
    }
    return null;
  } catch (error) {
    console.error("Error fetching advertisement:", error);
    return null;
  }
}

// Create advertisement (admin only)
export async function createAdvertisement(
  formData: FormData,
): Promise<Advertisement | null> {
  try {
    const response = await apiService.post<AdvertisementResponse>(
      "/advertisement",
      formData,
    );
    if (response?.success && response.data && !Array.isArray(response.data)) {
      return response.data as Advertisement;
    }
    return null;
  } catch (error) {
    console.error("Error creating advertisement:", error);
    throw error;
  }
}

// Update advertisement (admin only)
export async function updateAdvertisement(
  id: string,
  formData: FormData,
): Promise<Advertisement | null> {
  try {
    const response = await apiService.patch<AdvertisementResponse>(
      `/advertisement/${id}`,
      formData,
    );
    if (response?.success && response.data && !Array.isArray(response.data)) {
      return response.data as Advertisement;
    }
    return null;
  } catch (error) {
    console.error("Error updating advertisement:", error);
    throw error;
  }
}

// Toggle advertisement active status (admin only)
export async function toggleAdvertisementActive(
  id: string,
): Promise<Advertisement | null> {
  try {
    const response = await apiService.patch<AdvertisementResponse>(
      `/advertisement/${id}/toggle`,
      {},
    );
    if (response?.success && response.data && !Array.isArray(response.data)) {
      return response.data as Advertisement;
    }
    return null;
  } catch (error) {
    console.error("Error toggling advertisement:", error);
    throw error;
  }
}

// Delete advertisement (admin only)
export async function deleteAdvertisement(id: string): Promise<boolean> {
  try {
    const response = await apiService.delete<AdvertisementResponse>(
      `/advertisement/${id}`,
    );
    return response?.success === true;
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    throw error;
  }
}
