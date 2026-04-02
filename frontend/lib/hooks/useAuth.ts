// "use client";

// import { useDispatch, useSelector } from "react-redux";
// import { useRouter } from "next/navigation";
// import { AppDispatch, RootState } from "../store";
// import {
//   loginUser,
//   registerUser,
//   verifyOtpAndRegister,
//   sendOTP,
//   getCurrentUser,
//   logoutUser,
//   refreshToken,
//   updateUser,
//   setError,
//   clearAuth,
// } from "@/lib/redux/authSlice";
// import { LoginRequest, OTPRequest, User } from "@/types/auth";
// import { showToast } from "@/lib/utils/toastHelper";
// import { useCallback } from "react"; // Import useCallback

// const ROLE_ROUTES: Record<string, string> = {
//   guide: "/dashboard/guide",
//   admin: "/admin",
//   manager: "/admin",
//   user: "/dashboard/user",
//   tourist: "/dashboard/user", // Backend uses 'tourist' role
// };

// export const useAuth = () => {
//   const dispatch = useDispatch<AppDispatch>();
//   const router = useRouter();
//   const { user, loading, error, isAuthenticated } = useSelector(
//     (state: RootState) => state.auth,
//   );

//   const login = useCallback(
//     async (credentials: LoginRequest) => {
//       const result = await dispatch(loginUser(credentials)).unwrap();

//       if (result) {
//         // Extract user data from the response
//         // Backend returns { success: true, data: { token, user } }
//         const userData = result.user;
//         const role = userData?.role ?? "user";
//         const userName = userData?.name || "User";

//         showToast.success(`Welcome back, ${userName}!`);

//         // Redirect based on role
//         const redirectPath = ROLE_ROUTES[role] ?? "/dashboard";
//         console.log(
//           "Login successful - Role:",
//           role,
//           "Redirecting to:",
//           redirectPath,
//         );
//         router.push(redirectPath);
//       } else {
//         showToast.error((result.payload as string) || "Login failed");
//       }
//       return result;
    
//     [dispatch, router],
//   );

//   const sendOtp = useCallback(
//     async (data: OTPRequest) => {
//       const result = await dispatch(sendOTP(data));
//       if (sendOTP.fulfilled.match(result)) {
//         showToast.success("OTP sent successfully to your email!");
//       } else {
//         showToast.error((result.payload as string) || "Failed to send OTP");
//       }
//       return result;
//     },
//     [dispatch],
//   );

//   const verifyAndRegister = useCallback(
//     async (formData: FormData) => {
//       const result = await dispatch(verifyOtpAndRegister(formData));
//       if (verifyOtpAndRegister.fulfilled.match(result)) {
//         showToast.success("Registration successful! Redirecting...");
//       } else {
//         showToast.error((result.payload as string) || "Registration failed");
//       }
//       return result;
//     },
//     [dispatch],
//   );

//   const register = useCallback(
//     async (data: any) => {
//       const result = await dispatch(registerUser(data));
//       if (registerUser.fulfilled.match(result)) {
//         showToast.success("Registration successful! Redirecting...");
//       } else {
//         showToast.error((result.payload as string) || "Registration failed");
//       }
//       return result;
//     },
//     [dispatch],
//   );

//   const fetchCurrentUser = useCallback(async () => {
//     // This function should only fetch the user, not handle redirects.
//     // Page-level protection should handle redirects.
//     return dispatch(getCurrentUser());
//   }, [dispatch]);

//   const refresh = useCallback(async () => {
//     return dispatch(refreshToken());
//   }, [dispatch]);

//   const logout = useCallback(async () => {
//     await dispatch(logoutUser());
//     showToast.info("Logged out successfully. See you soon!");
//     router.push("/");
//   }, [dispatch, router]);

//   return {
//     user,
//     loading,
//     error,
//     isAuthenticated,
//     login,
//     register,
//     sendOtp,
//     verifyAndRegister,
//     fetchCurrentUser,
//     refresh,
//     logout,
//     clearAuthError: () => dispatch(setError(null)),
//     updateAuthUser: (data: Partial<User>) => dispatch(updateUser(data)),
//     clearAuth: () => dispatch(clearAuth()),
//   };
// };


"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { AppDispatch, RootState } from "../store";
import {
  loginUser,
  registerUser,
  sendLoginOtp,
  loginWithOtp,
  getCurrentUser,
  logoutUser,
  refreshToken,
  updateUser,
  setError,
  clearAuth,
} from "@/lib/redux/authSlice";
import { LoginRequest, User } from "@/types/auth";
import { showToast } from "@/lib/utils/toastHelper";
import { useCallback } from "react";

const ROLE_ROUTES: Record<string, string> = {
  guide: "/dashboard/guide",
  admin: "/admin",
  manager: "/admin",
  user: "/dashboard/user",
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
        const role = userData?.role ?? "user";
        const userName = userData?.name || "User";

        showToast.success(`Welcome back, ${userName}!`);
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
        router.push("/admin");
        return result;
      } catch (err: any) {
        showToast.error(err || "Invalid OTP");
      }
    },
    [dispatch, router],
  );

  const register = useCallback(
    async (data: any) => {
      const result = await dispatch(registerUser(data));
      if (registerUser.fulfilled.match(result)) {
        showToast.success("Registration successful!");
      } else {
        showToast.error((result.payload as string) || "Registration failed");
      }
      return result;
    },
    [dispatch],
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
    register,
    fetchCurrentUser,
    refresh,
    logout,
    clearAuthError: () => dispatch(setError(null)),
    updateAuthUser: (data: Partial<User>) => dispatch(updateUser(data)),
    clearAuth: () => dispatch(clearAuth()),
  };
};
