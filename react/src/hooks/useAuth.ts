import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "antd";

import {
  forgotPassword,
  getAccountInfo,
  login,
  logout,
  register,
  updateUserEmail,
} from "../api/auth";
import { ROUTES } from "../utils/routers";

import type { ILoginFormData, IRegisterFormData } from "../utils/types";

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: ILoginFormData) => login(data),
    onSuccess: () => {
      message.success("Đăng nhập thành công");
      window.location.href = ROUTES.DASHBOARD;
    },
    onError: (error: any) => {
      message.error(
        error?.message || "Login failed. Please check your credentials.",
      );
      console.error("Login error:", error);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: IRegisterFormData) => register(data),
    onSuccess: () => {
      message.success("Đăng ký thành công. Vui lòng đăng nhập.");
      window.location.href = ROUTES.LOGIN;
    },
    onError: (error: any) => {
      message.error(error?.message || "Đăng ký thất bại. Vui lòng thử lại.");
      console.error("Register error:", error);
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      window.location.href = ROUTES.LOGIN;
    },
    onError: (error) => {
      message.error("Logout failed. Please try again.");
      console.error("Logout error:", error);
    },
  });
};

export const useGetAccountInfo = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["accountInfo"],
    queryFn: () => getAccountInfo(),
    enabled: options?.enabled ?? true,
  });
};

export const useUpdateUserEmail = () => {
  return useMutation({
    mutationFn: (email: string) => updateUserEmail(email),
    onSuccess: () => {
      message.success("Email updated successfully!");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to update email.");
      console.error("Update email error:", error);
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: { username: number; email: string }) =>
      forgotPassword(data.username, data.email),
    onSuccess: () => {
      message.success("Password reset email sent successfully!");
    },
    onError: (error: any) => {
      message.error(error?.message || "Failed to send password reset email.");
      console.error("Forgot password error:", error);
    },
  });
};
