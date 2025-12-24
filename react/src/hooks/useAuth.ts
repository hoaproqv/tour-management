import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "antd";

import {
  forgotPassword,
  getAccountInfo,
  login,
  logout,
  updateUserEmail,
} from "../api/auth";

import type { ILoginFormData } from "../utils/types";

export const useLogin = () => {
  return useMutation({
    mutationFn: (data: ILoginFormData) => login(data),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("account", JSON.stringify(data.user));
      window.location.href = "/";
    },
    onError: (error) => {
      message.error("Login failed. Please check your credentials.");
      console.error("Login error:", error);
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("account");
      window.location.href = "/view/login";
    },
    onError: (error) => {
      message.error("Logout failed. Please try again.");
      console.error("Logout error:", error);
    },
  });
};

export const useGetAccountInfo = () => {
  return useQuery({
    queryKey: ["accountInfo"],
    queryFn: () => getAccountInfo(),
  });
};

export const useUpdateUserEmail = () => {
  return useMutation({
    mutationFn: (email: string) => updateUserEmail(email),
    onSuccess: () => {
      message.success("Email updated successfully!");
    },
    onError: (error) => {
      message.error("Failed to update email.");
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
    onError: (error) => {
      message.error("Failed to send password reset email.");
      console.error("Forgot password error:", error);
    },
  });
};
