import Constants from "expo-constants";
import { Platform } from "react-native";

const isProduction = process.env.NODE_ENV === "production";

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

function parseApiBaseUrl(): string {
  const rawValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!rawValue) {
    if (isProduction) {
      throw new Error("Missing required environment variable: EXPO_PUBLIC_API_BASE_URL");
    }

    return inferDevBaseUrl();
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use http or https");
  }

  if (isProduction && parsed.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use https in production");
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

    return new URL(API_BASE_URL).origin;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("EXPO_PUBLIC_REQUEST_ORIGIN must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("EXPO_PUBLIC_REQUEST_ORIGIN must use http or https");
  }

  return parsed.origin;
}

export const REQUEST_ORIGIN = parseRequestOrigin();
export const REQUEST_REFERER = `${REQUEST_ORIGIN}/mobile`;
