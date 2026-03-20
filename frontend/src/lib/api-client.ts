import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE_URL } from "@/lib/env";

// Request deduplication map
const pendingRequests = new Map<string, Promise<AxiosResponse>>();

// Generate request key for deduplication
function generateRequestKey(config: InternalAxiosRequestConfig): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

    if (config.url?.includes("/api/v1/businesses") || config.url?.includes("/auth/me")) {
      console.log("[AuthDebug] Request prepared", {
        url: config.url,
        hasAccessToken: !!tokens?.accessToken,
        authHeaderPresent: !!config.headers.Authorization,
      });
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

    if (originalRequest?.url?.includes("/api/v1/businesses") || originalRequest?.url?.includes("/auth/me")) {
      console.log("[AuthDebug] Request failed", {
        url: originalRequest?.url,
        status: error.response?.status,
        hasAccessToken: !!useAuthStore.getState().tokens?.accessToken,
        responseData: error.response?.data ?? null,
      });
    }

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
        console.log("[AuthDebug] Missing refresh token before refresh attempt");
        clearAuth();
        return Promise.reject(error);
      }

      // Create refresh promise
      refreshPromise = (async () => {
        try {
          console.log("[AuthDebug] Attempting refresh", {
            refreshUrl: "/auth/refresh",
            hasRefreshToken: !!tokens.refreshToken,
          });
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
          console.log("[AuthDebug] Refresh failed", {
            status: refreshError?.response?.status,
            data: refreshError?.response?.data ?? null,
          });
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

