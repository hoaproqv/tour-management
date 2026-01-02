import axios from "axios";

import { refreshToken } from "./auth";

const normalizeBaseURL = (url: string | undefined) => {
  const raw = (url || "").trim();
  if (!raw) return "/api";

  const withoutTrailing = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return withoutTrailing.endsWith("/api")
    ? withoutTrailing
    : `${withoutTrailing}/api`;
};

const axiosInstance = axios.create({
  baseURL: normalizeBaseURL(process.env.BASE_URL),
  withCredentials: true, // cần để gửi cookie CSRF/refresh nếu server đặt ở domain gốc
});

axiosInstance.interceptors.request.use(
  function (config) {
    config.headers = config.headers || {};

    if (!config.headers.Accept) {
      config.headers.Accept = "application/json";
    }
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json; charset=utf-8";
    }
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    // Chỉ thêm Authorization header nếu không phải /auth/login hoặc /auth/refresh
    const isAuthPath =
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/register") ||
      config.url?.includes("/auth/refresh");

    if (!isAuthPath) {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu gặp lỗi 401 và request chưa được retry
    const isAuthRefreshCall = originalRequest.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRefreshCall
    ) {
      originalRequest._retry = true;

      try {
        const tokens = await refreshToken();

        if (tokens?.access) {
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);
          originalRequest.headers.Authorization = `Bearer ${tokens.access}`;
          return axiosInstance(originalRequest);
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/view/login";
        return Promise.reject(new Error("Authentication failed"));
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/view/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

export default axiosInstance;
