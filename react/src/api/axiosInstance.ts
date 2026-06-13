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
  withCredentials: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Token-refresh queue
//
// Khi nhiều API được gọi cùng lúc và tất cả đều nhận 401, chúng ta chỉ muốn
// gọi refreshToken() MỘT LẦN DUY NHẤT rồi phát lại kết quả cho tất cả.
//
// Cách hoạt động:
//  1. Request đầu tiên nhận 401 → bắt đầu refresh, lưu promise vào refreshingPromise.
//  2. Các request sau nhận 401 trong khi refresh đang chạy → KHÔNG gọi lại refresh,
//     mà subscribe vào cùng promise đó thông qua hàng chờ (failedQueue).
//  3. Khi refresh hoàn thành → giải quyết / từ chối toàn bộ hàng chờ.
// ─────────────────────────────────────────────────────────────────────────────
let refreshingPromise: Promise<string | null> | null = null;

type QueueEntry = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
const failedQueue: QueueEntry[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.splice(0).forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token as string);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Request interceptor — đính kèm access token vào mỗi request
// ─────────────────────────────────────────────────────────────────────────────
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
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// Response interceptor — xử lý 401 với refresh-queue
// ─────────────────────────────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRefreshCall = originalRequest.url?.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthRefreshCall
    ) {
      return Promise.reject(error.response?.data ?? error);
    }

    // Đánh dấu request này đã được retry để tránh vòng lặp vô tận
    originalRequest._retry = true;

    // ── Nếu đang có refresh đang chạy, đưa request vào hàng chờ ──
    if (refreshingPromise) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // ── Chưa có refresh → bắt đầu refresh một lần duy nhất ──
    refreshingPromise = refreshToken()
      .then((tokens) => {
        if (!tokens?.access) return null;
        localStorage.setItem("access_token", tokens.access);
        localStorage.setItem("refresh_token", tokens.refresh);
        return tokens.access;
      })
      .finally(() => {
        // Dù thành công hay thất bại, reset về null để lần sau có thể refresh lại
        refreshingPromise = null;
      });

    try {
      const newToken = await refreshingPromise;

      if (newToken) {
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      }

      // Refresh trả về null — token hết hạn hoàn toàn
      processQueue(new Error("Authentication failed"));
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/view/login";
      return Promise.reject(new Error("Authentication failed"));
    } catch (refreshError) {
      processQueue(refreshError);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/view/login";
      return Promise.reject(refreshError);
    }
  },
);

export default axiosInstance;
