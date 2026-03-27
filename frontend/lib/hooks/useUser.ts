// lib/hooks/useUser.ts
"use client";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store";
import {
  getAllUsers,
  getUserById,
  getUsersByRole,
  createUser,
  updateUserById,
  updateOwnProfile,
  getOwnProfile,
  deleteUser,
  clearUsers,
  clearError,
  clearCurrentUser,
} from "@/lib/redux/userSlice";
import {
  GetUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types/auth";
import { useCallback } from "react"; // Import useCallback

export const useUser = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { users, currentUser, loading, error, pagination } = useSelector(
    (state: RootState) => state.user
  );

  // Memoize all dispatch functions to ensure stable references
  const memoizedGetOwnProfile = useCallback(() => {
    dispatch(getOwnProfile());
  }, [dispatch]);

  const memoizedUpdateOwnProfile = useCallback(
    (data: UpdateUserRequest) => {
      // Return the dispatched promise for handling in the component
      return dispatch(updateOwnProfile(data));
    },
    [dispatch]
  );

  const memoizedGetAllUsers = useCallback(
    (params?: GetUsersParams) => {
      dispatch(getAllUsers(params));
    },
    [dispatch]
  );

  const memoizedGetUserById = useCallback(
    (id: string) => {
      dispatch(getUserById(id));
    },
    [dispatch]
  );
  
  const memoizedGetUsersByRole = useCallback(
    (role: string) => {
      dispatch(getUsersByRole(role));
    },
    [dispatch]
  );

  const memoizedCreateUser = useCallback(
    (data: CreateUserRequest) => {
      return dispatch(createUser(data));
    },
    [dispatch]
  );

  const memoizedUpdateUserById = useCallback(
    (id: string, data: UpdateUserRequest) => {
      return dispatch(updateUserById({ userId: id, data }));
    },
    [dispatch]
  );

  const memoizedDeleteUser = useCallback(
    (id: string) => {
      return dispatch(deleteUser(id));
    },
    [dispatch]
  );

  const memoizedClearAllUsers = useCallback(() => {
    dispatch(clearUsers());
  }, [dispatch]);

  const memoizedClearUserError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const memoizedClearCurrentUser = useCallback(() => {
    dispatch(clearCurrentUser());
  }, [dispatch]);

  return {
    // State
    users,
    currentUser,
    loading,
    error,
    pagination,

    // Actions with stable references
    getOwnProfile: memoizedGetOwnProfile,
    updateOwnProfile: memoizedUpdateOwnProfile,
    getAllUsers: memoizedGetAllUsers,
    getUserById: memoizedGetUserById,
    getUsersByRole: memoizedGetUsersByRole,
    createUser: memoizedCreateUser,
    updateUserById: memoizedUpdateUserById,
    deleteUser: memoizedDeleteUser,
    clearAllUsers: memoizedClearAllUsers,
    clearUserError: memoizedClearUserError,
    clearCurrentUser: memoizedClearCurrentUser,
  };
};