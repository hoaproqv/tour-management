import { fetchData, postData, putData } from "./api";

import type { ILoginFormData } from "../utils/types";

const API_URL = "/auth";

export const fetchCsrfToken = async () => {
  try {
    await fetchData(`api/csrf`);
  } catch (error) {
    console.error("Lỗi khi lấy CSRF token:", error);
  }
};

export const login = async (data: ILoginFormData) => {
  const response = await postData(`${API_URL}/login`, data);

  return response;
};

export const refreshToken = async () => {
  const response = await postData(`${API_URL}/refresh`, {});

  return response.access_token;
};

export const logout = async () => {
  const response = await postData(`${API_URL}/logout`, {});
  localStorage.removeItem("access_token");
  return response;
};

export const getAccountInfo = async () => {
  const response = await fetchData(`${API_URL}/profile`);
  return response;
};

export const updateUserEmail = async (email: string) => {
  const response = await putData(`${API_URL}/profile`, { email });
  return response;
};

export const forgotPassword = async (username: number, email: string) => {
  const response = await postData(`${API_URL}/forget_password`, {
    username,
    email,
  });
  return response;
};
