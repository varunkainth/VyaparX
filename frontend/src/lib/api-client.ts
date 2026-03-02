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

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const waitForTokenRefresh = (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }
  return Promise.reject(new Error("No refresh in progress"));
};

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

// Response interceptor to handle token refresh and cleanup deduplication
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
        console.log("[API] Token refresh in progress, waiting...");
        try {
          const newAccessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Start new refresh
      isRefreshing = true;
      const { tokens, setTokens, clearAuth } = useAuthStore.getState();

      if (!tokens?.refreshToken) {
        console.log("[API] No refresh token available, clearing auth");
        isRefreshing = false;
        refreshPromise = null;
        clearAuth();
        return Promise.reject(error);
      }

      // Create refresh promise
      refreshPromise = (async () => {
        try {
          console.log("[API] Refreshing access token...");
          console.log("[API] Using refresh token:", tokens.refreshToken?.substring(0, 20) + "...");
          
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${tokens.refreshToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          const newTokens = response.data.data.tokens;
          setTokens(newTokens);
          console.log("[API] Token refreshed successfully");
          console.log("[API] New access token:", newTokens.accessToken?.substring(0, 20) + "...");
          return newTokens.accessToken;
        } catch (refreshError: any) {
          console.error("[API] Token refresh failed!");
          console.error("[API] Error status:", refreshError?.response?.status);
          console.error("[API] Error data:", refreshError?.response?.data);
          console.error("[API] Error message:", refreshError.message);
          console.log("[API] Clearing auth and redirecting to login...");
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
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

