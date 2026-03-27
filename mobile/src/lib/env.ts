import Constants from "expo-constants";
import { Platform } from "react-native";

const isProduction = process.env.NODE_ENV === "production";
const configErrors: string[] = [];

function inferDevBaseUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:4000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}

function recordConfigError(message: string): null {
  if (!configErrors.includes(message)) {
    configErrors.push(message);
  }

  return null;
}

function parseApiBaseUrl(): string {
  const rawValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!rawValue) {
    if (isProduction) {
      recordConfigError("Missing required environment variable: EXPO_PUBLIC_API_BASE_URL");
      return "";
    }

    return inferDevBaseUrl();
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    recordConfigError("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL");
    return "";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    recordConfigError("EXPO_PUBLIC_API_BASE_URL must use http or https");
    return "";
  }

  if (isProduction && parsed.protocol !== "https:") {
    recordConfigError("EXPO_PUBLIC_API_BASE_URL must use https in production");
    return "";
  }

  return parsed.toString().replace(/\/$/, "");
}

export const API_BASE_URL = parseApiBaseUrl();

function parseRequestOrigin(): string {
  const rawValue = process.env.EXPO_PUBLIC_REQUEST_ORIGIN?.trim();

  if (!rawValue) {
    if (!isProduction) {
      return "http://localhost:3000";
    }

    if (API_BASE_URL) {
      return new URL(API_BASE_URL).origin;
    }

    recordConfigError("Missing required environment variable: EXPO_PUBLIC_REQUEST_ORIGIN");
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    recordConfigError("EXPO_PUBLIC_REQUEST_ORIGIN must be a valid absolute URL");
    return "";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    recordConfigError("EXPO_PUBLIC_REQUEST_ORIGIN must use http or https");
    return "";
  }

  return parsed.origin;
}

export const REQUEST_ORIGIN = parseRequestOrigin();
export const REQUEST_REFERER = `${REQUEST_ORIGIN}/mobile`;
export const ENV_CONFIG_ERROR = configErrors.length ? configErrors.join("\n") : null;
