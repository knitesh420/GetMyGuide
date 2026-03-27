// This file is optional but recommended for centralized type exports

export type {
  Advertisement,
  AdvertisementResponse,
} from "@/lib/service/advertisementService";

export {
  getAdvertisements,
  getAllAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  toggleAdvertisementActive,
  deleteAdvertisement,
} from "@/lib/service/advertisementService";

export {
  fetchAdvertisements,
  fetchAllAdvertisements,
  fetchAdvertisementById,
  createNewAdvertisement,
  updateAdvertisementData,
  toggleAdvertisement,
  deleteAdvertisementData,
  clearError,
  clearSelectedAdvertisement,
} from "@/lib/redux/advertisementSlice";
