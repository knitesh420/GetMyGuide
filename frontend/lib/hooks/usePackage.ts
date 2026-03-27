// lib/hooks/usePackages.ts
"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store";
import {
  fetchPackages,
  fetchPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageStatus,
  clearError,
  clearCurrentPackage,
  setCurrentPage,
} from "@/lib/redux/packageSlice";
import { showToast } from "@/lib/utils/toastHelper";

export const usePackages = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    packages,
    currentPackage,
    loading,
    error,
    total,
    page,
    totalPages,
    creating,
    updating,
    deleting,
    toggling,
  } = useSelector((state: RootState) => state.packages);

  const loadPackages = async (params = {}) => {
    const result = await dispatch(fetchPackages(params));
    if (fetchPackages.rejected.match(result)) {
      showToast.error((result.payload as string) || "Failed to load packages");
    }
    return result;
  };

  const loadPackageById = async (id: string) => {
    const result = await dispatch(fetchPackageById(id));
    if (fetchPackageById.rejected.match(result)) {
      showToast.error((result.payload as string) || "Failed to load package");
    }
    return result;
  };

  const savePackage = async (packageData: any) => {
    const result = await dispatch(createPackage(packageData));
    if (createPackage.fulfilled.match(result)) {
      showToast.success("Package created successfully!");
    } else {
      showToast.error((result.payload as string) || "Failed to create package");
    }
    return result;
  };

  const editPackage = async (id: string, packageData: any) => {
    const result = await dispatch(updatePackage({ id, packageData }));
    if (updatePackage.fulfilled.match(result)) {
      showToast.success("Package updated successfully!");
    } else {
      showToast.error((result.payload as string) || "Failed to update package");
    }
    return result;
  };

  const removePackage = async (id: string) => {
    const result = await dispatch(deletePackage(id));
    if (deletePackage.fulfilled.match(result)) {
      showToast.success("Package deleted successfully!");
    } else {
      showToast.error((result.payload as string) || "Failed to delete package");
    }
    return result;
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    const result = await dispatch(togglePackageStatus({ id, isActive }));
    if (togglePackageStatus.fulfilled.match(result)) {
      showToast.success(
        `Package ${isActive ? "activated" : "deactivated"} successfully!`
      );
    } else {
      showToast.error(
        (result.payload as string) || "Failed to update package status"
      );
    }
    return result;
  };

  return {
    packages,
    currentPackage,
    loading,
    error,
    total,
    page,
    totalPages,
    creating,
    updating,
    deleting,
    toggling,
    loadPackages,
    loadPackageById,
    savePackage,
    editPackage,
    removePackage,
    toggleStatus,
    clearError: () => dispatch(clearError()),
    clearCurrentPackage: () => dispatch(clearCurrentPackage()),
    setCurrentPage: (page: number) => dispatch(setCurrentPage(page)),
  };
};
