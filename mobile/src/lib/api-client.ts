import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_BASE_URL, REQUEST_ORIGIN, REQUEST_REFERER } from "./env";
import { refreshSession } from "./session";
import { useAuthStore } from "../store/auth-store";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const { tokens } = useAuthStore.getState();
  const method = config.method?.toUpperCase();

  if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    config.headers.Origin = config.headers.Origin ?? REQUEST_ORIGIN;
    config.headers.Referer = config.headers.Referer ?? REQUEST_REFERER;
  }

  if (tokens?.accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/signup")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const nextTokens = await refreshSession();
      if (!nextTokens) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${nextTokens.accessToken}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
