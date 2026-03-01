import { AxiosError } from "axios";
import { ERROR_MESSAGES, type ErrorCode } from "@/constants/errorCodes";

interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
  requestId?: string;
}

/**
 * Extract user-friendly error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  // If it's an Axios error with response
  if (error instanceof AxiosError && error.response?.data) {
    const apiError = error.response.data as ApiErrorResponse;
    
    // If backend provides error code, use our mapped message
    if (apiError.error?.code) {
      const friendlyMessage = ERROR_MESSAGES[apiError.error.code];
      if (friendlyMessage) {
        return friendlyMessage;
      }
    }
    
    // Fallback to backend's message if available
    if (apiError.error?.message) {
      return apiError.error.message;
    }
  }

  // Network errors
  if (error instanceof AxiosError) {
    if (error.code === "ERR_NETWORK") {
      return "Network error. Please check your internet connection.";
    }
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }
  }

  // Generic fallback
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Get error code from API error response
 */
export function getErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof AxiosError && error.response?.data) {
    const apiError = error.response.data as ApiErrorResponse;
    return apiError.error?.code || null;
  }
  return null;
}

/**
 * Check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return getErrorCode(error) === code;
}
