import { fetchData, postData, putData } from "./api";

import type { ILoginFormData, IRegisterFormData, IUser } from "../utils/types";

const API_URL = "/auth";

interface AuthTokens {
  access: string;
  refresh: string;
}

interface LoginPayload {
  tokens: AuthTokens;
  user: IUser;
}

const unwrapSuccess = <T>(response: any): T => {
  if (response?.success && response.data) {
    return response.data as T;
  }
  throw new Error(response?.message || "Request failed");
};

export const fetchCsrfToken = async () => {
  try {
    await fetchData(`/csrf`);
  } catch (error) {
    console.error("Lỗi khi lấy CSRF token:", error);
  }
};

export const register = async (data: IRegisterFormData) => {
  const response = await postData(`${API_URL}/register`, data);
  const user = unwrapSuccess<IUser>(response);
  return user;
};

export const login = async (data: ILoginFormData) => {
  const response = await postData(`${API_URL}/login`, data);
  const payload = unwrapSuccess<LoginPayload>(response);

  localStorage.setItem("access_token", payload.tokens.access);
  localStorage.setItem("refresh_token", payload.tokens.refresh);
  localStorage.setItem("account", JSON.stringify(payload.user));

  return payload;
};

export const refreshToken = async (refresh?: string) => {
  const refreshValue = refresh || localStorage.getItem("refresh_token");
  if (!refreshValue) return null;

  const response = await postData(`${API_URL}/refresh`, {
    refresh: refreshValue,
  });

  const payload = unwrapSuccess<{ tokens: AuthTokens }>(response);
  return payload.tokens;
};

export const logout = async () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("account");
  return { success: true };
};

export const getAccountInfo = async () => {
  const response = await fetchData(`${API_URL}/me`);
  return unwrapSuccess<IUser>(response);
};

// Các API chưa có trên backend hiện tại. Trả về lỗi có kiểm soát để tránh silent fail.
export const updateUserEmail = async (email: string) => {
  throw new Error(`Update email API is not available yet (email=${email})`);
};

export const forgotPassword = async (email: string) => {
  const response = await postData(`${API_URL}/forgot-password`, { email });
  return unwrapSuccess<string>(response);
};

export const resetPassword = async (data: any) => {
  const response = await postData(`${API_URL}/reset-password`, data);
  return unwrapSuccess<string>(response);
};

export const updateProfile = async (data: Partial<IUser>) => {
  const response = await putData(`${API_URL}/me`, data);
  const updatedUser = unwrapSuccess<IUser>(response);
  localStorage.setItem("account", JSON.stringify(updatedUser));
  return updatedUser;
};

export const changePassword = async (data: any) => {
  const response = await putData(`${API_URL}/change-password`, data);
  return unwrapSuccess<string>(response);
};

export const checkPassword = async (data: any) => {
  const response = await postData(`${API_URL}/check-password`, data);
  return unwrapSuccess<boolean>(response);
};
