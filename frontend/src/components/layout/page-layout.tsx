"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh-indicator";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useState, useEffect } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  enablePullToRefresh?: boolean;
}

export function PageLayout({ 
  children, 
  onRefresh,
  enablePullToRefresh = true 
}: PageLayoutProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  useEffect(() => {
    if (user && !user.is_verified && isAuthenticated) {
      setShowVerificationBanner(true);
    } else {
      setShowVerificationBanner(false);
    }
  }, [user, isAuthenticated]);

  // Default refresh handler if none provided
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      // Default: just reload the page data
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: enablePullToRefresh,
  });

  return (
    <>
      <PullToRefreshIndicator
        isPulling={pullToRefresh.isPulling}
        isRefreshing={pullToRefresh.isRefreshing}
        pullDistance={pullToRefresh.pullDistance}
        threshold={80}
      />
      
      {showVerificationBanner && user && (
        <EmailVerificationBanner 
          userEmail={user.email} 
          onDismiss={() => setShowVerificationBanner(false)}
        />
      )}
      
      {children}
      
      <MobileBottomNav />
    </>
  );
}
