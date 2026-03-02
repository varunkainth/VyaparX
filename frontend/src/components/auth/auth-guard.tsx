"use client"

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { checkAndRefreshToken, cancelTokenRefresh } from "@/lib/token-manager";
import { useBusinesses } from "@/hooks/use-businesses";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

// Routes that authenticated users shouldn't access (will redirect to dashboard)
const AUTH_REDIRECT_ROUTES = ["/login", "/signup"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, _hasHydrated } = useAuthStore();
  
  // Fetch businesses when authenticated
  useBusinesses();

  // Initialize token refresh on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkAndRefreshToken();
    }

    // Cleanup on unmount
    return () => {
      cancelTokenRefresh();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Wait for hydration before checking routes
    if (!_hasHydrated || isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthRedirectRoute = AUTH_REDIRECT_ROUTES.includes(pathname);

    devLog("[AuthGuard] Checking route:", pathname);
    devLog("[AuthGuard] isAuthenticated:", isAuthenticated);
    devLog("[AuthGuard] isLoading:", isLoading);
    devLog("[AuthGuard] _hasHydrated:", _hasHydrated);
    devLog("[AuthGuard] isPublicRoute:", isPublicRoute);

    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (isAuthenticated && isAuthRedirectRoute) {
      devLog("[AuthGuard] Redirecting to dashboard (already authenticated)");
      router.push("/dashboard");
      return;
    }

    // If user is not authenticated and trying to access protected route, redirect to login
    if (!isAuthenticated && !isPublicRoute) {
      devLog("[AuthGuard] Redirecting to login (not authenticated)");
      router.push("/login");
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router, _hasHydrated]);

  // Show loading state while hydrating or checking auth
  if (!_hasHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // For protected routes, don't render until authenticated
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (!isPublicRoute && !isAuthenticated) {
    return null;
  }

  // For auth redirect routes (login/signup), don't render if already authenticated
  const isAuthRedirectRoute = AUTH_REDIRECT_ROUTES.includes(pathname);
  if (isAuthRedirectRoute && isAuthenticated) {
    return null;
  }

  return (
    <>
      {children}
    </>
  );
}
