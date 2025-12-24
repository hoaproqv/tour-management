import axios from "axios";

import { refreshToken } from "./auth";

const axiosInstance = axios.create({
  baseURL: process.env.BASE_URL,
  withCredentials: true, // vẫn cần để gửi cookie sessionId
});

axiosInstance.interceptors.request.use(
  function (config) {
    if (!config.headers.Accept && config.headers["Content-Type"]) {
      config.headers.Accept = "application/json";
      config.headers["Content-Type"] = "application/json; charset=utf-8";
    }
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    // Chỉ thêm Authorization header nếu không phải /auth/login hoặc /auth/refresh
    if (config.url !== "/auth/login" && config.url !== "/auth/refresh") {
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
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.config.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;

      try {
        // Thử refresh token
        const newAccessToken = await refreshToken();

        if (newAccessToken) {
          // Cập nhật header Authorization với token mới
          localStorage.setItem("access_token", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          // Retry request ban đầu với token mới
          return axiosInstance(originalRequest);
        } else {
          // Refresh thất bại, redirect về login
          localStorage.removeItem("access_token");
          window.location.href = "/view/login";
          return Promise.reject(new Error("Authentication failed"));
        }
      } catch (refreshError) {
        // Refresh thất bại, redirect về login
        localStorage.removeItem("access_token");
        window.location.href = "/view/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

export default axiosInstance;
