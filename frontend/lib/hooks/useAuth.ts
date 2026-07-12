"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "../store";
import {
  loginUser,
  sendLoginOtp,
  loginWithOtp,
  sendRegistrationOtp as sendRegistrationOtpThunk,
  verifyRegistrationOtp as verifyRegistrationOtpThunk,
  sendForgotPasswordOtp as sendForgotPasswordOtpThunk,
  resetPasswordWithOtp as resetPasswordWithOtpThunk,
  getCurrentUser,
  logoutUser,
  refreshToken,
  updateUser,
  setError,
  clearAuth,
} from "@/lib/redux/authSlice";
import { LoginRequest, RegisterSendOtpRequest, User } from "@/types/auth";
import { showToast } from "@/lib/utils/toastHelper";
import { useCallback } from "react";

// Where each role lands after signing in. Admins go to /dashboard/admin, NOT the
// legacy /admin panel: only the /dashboard/* subtree mounts the shared sidebar,
// so an admin dropped on /admin sees that page's own seven hard-coded tabs and
// has no way to reach assignments, verification, refunds, payouts or reports.
// The legacy panel is still linked from the sidebar for the things only it has.
const ROLE_ROUTES: Record<string, string> = {
  guide: "/dashboard/guide",
  admin: "/dashboard/admin",
  tourist: "/dashboard/user",
};

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const result = await dispatch(loginUser(credentials)).unwrap();

        const userData = result.user;
        const role = userData?.role ?? "tourist";
        const userName = userData?.name || "User";

        showToast.success(`Welcome back ${userName}!`);
        router.push(ROLE_ROUTES[role] ?? "/dashboard");

        return result;
      } catch (err: any) {
        showToast.error(err || "Login failed");
      }
    },
    [dispatch, router],
  );

  const sendOtp = useCallback(
    async (email: string) => {
      try {
        await dispatch(sendLoginOtp({ email })).unwrap();
        showToast.success("OTP sent to your email!");
        return true;
      } catch (err: any) {
        showToast.error(err || "Failed to send OTP");
        return false;
      }
    },
    [dispatch],
  );

  const verifyOtpLogin = useCallback(
    async (email: string, otp: string) => {
      try {
        const result = await dispatch(loginWithOtp({ email, otp })).unwrap();
        const userData = result.user;
        const userName = userData?.name || "Admin";
        showToast.success(`Welcome back, ${userName}!`);
        // Route by role like every other login path, rather than assuming an
        // OTP login is always an admin — a tourist can log in with an OTP too.
        router.push(ROLE_ROUTES[userData?.role ?? "tourist"] ?? "/dashboard");
        return result;
      } catch (err: any) {
        showToast.error(err || "Invalid OTP");
      }
    },
    [dispatch, router],
  );

  const sendRegistrationOtp = useCallback(
    async (data: RegisterSendOtpRequest) => {
      try {
        await dispatch(sendRegistrationOtpThunk(data)).unwrap();
        showToast.success("Verification code sent to your email!");
        return true;
      } catch (err: any) {
        showToast.error(err || "Failed to send verification code");
        return false;
      }
    },
    [dispatch],
  );

  const verifyRegistrationOtp = useCallback(
    async (email: string, otp: string) => {
      try {
        const result = await dispatch(
          verifyRegistrationOtpThunk({ email, otp }),
        ).unwrap();
        const userData = result.user;
        showToast.success(`Welcome, ${userData?.name || "there"}!`);
        const role = userData?.role ?? "tourist";
        router.push(ROLE_ROUTES[role] ?? "/dashboard");
        return result;
      } catch (err: any) {
        showToast.error(err || "Invalid or expired code");
      }
    },
    [dispatch, router],
  );

  const sendForgotPasswordOtp = useCallback(
    async (email: string) => {
      try {
        await dispatch(sendForgotPasswordOtpThunk({ email })).unwrap();
        showToast.success(
          "If that email is registered, a reset code has been sent.",
        );
        return true;
      } catch (err: any) {
        showToast.error(err || "Failed to send reset code");
        return false;
      }
    },
    [dispatch],
  );

  const resetPasswordWithOtp = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      try {
        const result = await dispatch(
          resetPasswordWithOtpThunk({ email, otp, newPassword }),
        ).unwrap();
        showToast.success("Password reset! You're now logged in.");
        const userData = result.user;
        const role = userData?.role ?? "tourist";
        router.push(ROLE_ROUTES[role] ?? "/dashboard");
        return result;
      } catch (err: any) {
        showToast.error(err || "Invalid or expired code");
      }
    },
    [dispatch, router],
  );

  const fetchCurrentUser = useCallback(async () => {
    return dispatch(getCurrentUser());
  }, [dispatch]);

  const refresh = useCallback(async () => {
    return dispatch(refreshToken());
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    showToast.info("Logged out successfully. See you soon!");
    router.push("/");
  }, [dispatch, router]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    sendOtp,
    verifyOtpLogin,
    sendRegistrationOtp,
    verifyRegistrationOtp,
    sendForgotPasswordOtp,
    resetPasswordWithOtp,
    fetchCurrentUser,
    refresh,
    logout,
    clearAuthError: () => dispatch(setError(null)),
    updateAuthUser: (data: Partial<User>) => dispatch(updateUser(data)),
    clearAuth: () => dispatch(clearAuth()),
  };
};
