const isProduction = process.env.NODE_ENV === "production"

const parseApiBaseUrl = (): string => {
  const rawValue = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (!rawValue) {
    if (isProduction) {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_API_BASE_URL")
    }

    return "http://localhost:4000"
  }

  let parsed: URL
  try {
    parsed = new URL(rawValue)
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid absolute URL")
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use http or https")
  }

  if (isProduction && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use https in production")
  }

  return parsed.toString().replace(/\/$/, "")
}

export const API_BASE_URL = parseApiBaseUrl()
