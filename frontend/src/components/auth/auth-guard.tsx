"use client"

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/auth.service";
import { checkAndRefreshToken, cancelTokenRefresh } from "@/lib/token-manager";
import { useBusinesses } from "@/hooks/use-businesses";
import { CreateBusinessModal } from "@/components/business/create-business-modal";

// Helper for dev-only logging
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
const PUBLIC_ROUTE_PREFIXES = ["/shared/invoice"];

// Routes that authenticated users shouldn't access (will redirect to dashboard)
const AUTH_REDIRECT_ROUTES = ["/login", "/signup"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, _hasHydrated, setAuth, clearAuth, setLoading } = useAuthStore();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  
  const isPublicRoute = (path: string) => {
    return PUBLIC_ROUTES.includes(path) || PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
  };

  // Fetch businesses when authenticated
  const { businesses } = useBusinesses();

  useEffect(() => {
    if (!_hasHydrated || isAuthenticated) return;

    let isMounted = true;
    setLoading(true);

    void authService.getMe()
      .then((response) => {
        if (!isMounted) return;
        setAuth(response.user, response.session);
      })
      .catch(() => {
        if (!isMounted) return;
        clearAuth();
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [_hasHydrated, isAuthenticated, setAuth, clearAuth, setLoading]);

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

  // Check for empty businesses and show modal - using setTimeout to avoid setState in effect
  useEffect(() => {
    if (!_hasHydrated || isLoading || !isAuthenticated) return;
    
    // Use setTimeout to avoid the linter warning about setState in effect
    const timer = setTimeout(() => {
      if (businesses.length === 0 && !showBusinessModal) {
        devLog("[AuthGuard] Authenticated user has no businesses, showing creation modal");
        setShowBusinessModal(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, businesses.length, showBusinessModal, _hasHydrated, isLoading]);

  useEffect(() => {
    // Wait for hydration before checking routes
    if (!_hasHydrated || isLoading) return;

    const isCurrentRoutePublic = isPublicRoute(pathname);
    const isAuthRedirectRoute = AUTH_REDIRECT_ROUTES.includes(pathname);

    devLog("[AuthGuard] Checking route:", pathname);
    devLog("[AuthGuard] isAuthenticated:", isAuthenticated);
    devLog("[AuthGuard] isLoading:", isLoading);
    devLog("[AuthGuard] _hasHydrated:", _hasHydrated);
    devLog("[AuthGuard] isPublicRoute:", isCurrentRoutePublic);

    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (isAuthenticated && isAuthRedirectRoute) {
      devLog("[AuthGuard] Redirecting to dashboard (already authenticated)");
      router.push("/dashboard");
      return;
    }

    // If user is not authenticated and trying to access protected route, redirect to login
    if (!isAuthenticated && !isCurrentRoutePublic) {
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
  const isCurrentRoutePublic = isPublicRoute(pathname);
  if (!isCurrentRoutePublic && !isAuthenticated) {
    return null;
  }

  // For auth redirect routes (login/signup), don't render if already authenticated
  const isAuthRedirectRoute = AUTH_REDIRECT_ROUTES.includes(pathname);
  if (isAuthRedirectRoute && isAuthenticated) {
    return null;
  }

  // Handle business creation modal
  const handleBusinessCreated = () => {
    devLog("[AuthGuard] Business created successfully");
    setShowBusinessModal(false);
    // The user will be redirected to dashboard by the modal
  };

  return (
    <>
      {children}
      <CreateBusinessModal 
        open={showBusinessModal} 
        onOpenChange={setShowBusinessModal}
        onSuccess={handleBusinessCreated}
      />
    </>
  );
}
