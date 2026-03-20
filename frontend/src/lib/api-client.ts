import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

// Request deduplication map
const pendingRequests = new Map<string, Promise<AxiosResponse>>();

// Generate request key for deduplication
function generateRequestKey(config: InternalAxiosRequestConfig): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Refresh state
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// Request interceptor to add auth token and handle deduplication
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();

    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    // Request deduplication for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const requestKey = generateRequestKey(config);
      const pendingRequest = pendingRequests.get(requestKey);
      
      if (pendingRequest) {
        // Return existing pending request
        return Promise.reject({
          config,
          message: 'Request deduplicated',
          __DEDUPLICATED__: true,
          pendingRequest,
        });
      }
    }
    
    // Log API calls for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session refresh and cleanup deduplication
apiClient.interceptors.response.use(
  (response) => {
    // Clean up pending request
    if (response.config.method?.toLowerCase() === 'get') {
      const requestKey = generateRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  async (error) => {
    // Handle deduplicated requests
    if (error.__DEDUPLICATED__) {
      return error.pendingRequest;
    }
    
    // Clean up pending request on error
    if (error.config?.method?.toLowerCase() === 'get') {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }
    const originalRequest = error.config;

    // Skip refresh for auth endpoints
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If already refreshing, wait for that refresh to complete
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Start new refresh
      isRefreshing = true;
      const { tokens, setTokens, clearAuth } = useAuthStore.getState();

      if (!tokens?.refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }

      // Create refresh promise
      refreshPromise = (async () => {
        try {
          const newTokens = await apiClient.post<{ data: { tokens: { accessToken: string; refreshToken: string } } }>(
            "/auth/refresh",
            {},
            {
              headers: {
                Authorization: `Bearer ${tokens.refreshToken}`,
              },
            }
          );
          setTokens(newTokens.data.data.tokens);
        } catch (refreshError: any) {
          console.error("[API] Session refresh failed:", refreshError?.message);
          clearAuth();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw refreshError;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

