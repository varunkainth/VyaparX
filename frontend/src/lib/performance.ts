// Performance monitoring utilities

export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    fn();
    return;
  }

  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
};

export const reportWebVitals = (metric: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === "production") {
    // Example: Send to Google Analytics
    // window.gtag?.("event", metric.name, {
    //   value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // });
  }
};

// Memoization helper for expensive computations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Throttle function for scroll/resize handlers
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounce function for input handlers
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Lazy load component helper
export const lazyWithPreload = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) => {
  const Component = React.lazy(factory);
  (Component as any).preload = factory;
  return Component;
};

// Check if code is running on client
export const isClient = typeof window !== "undefined";

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (!isClient) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Get connection speed
export const getConnectionSpeed = (): "slow" | "fast" | "unknown" => {
  if (!isClient) return "unknown";
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return "unknown";
  
  const effectiveType = connection.effectiveType;
  
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return "slow";
  }
  
  return "fast";
};

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  if (!isClient) return;
  
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Import React for lazy loading
import React from "react";
