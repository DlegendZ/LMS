import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/types/api";
import { demoAdapter } from "@/lib/demo";

const API_BASE_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For cookies (refresh token)
  timeout: 5000, // 5 second timeout for all requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Demo build (GitHub Pages): serve every request from the in-browser mock
if (import.meta.env.VITE_DEMO === "true") {
  api.defaults.adapter = demoAdapter;
}

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying, try to refresh
    // But don't refresh if this is a login request or already a refresh request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - just reject without redirecting
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;

    // Try to get message from response data first
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    // Fallback to error message or generic message
    return axiosError.message || "An error occurred";
  }
  return "An unexpected error occurred";
};
