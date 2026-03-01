"use client";

import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullDistance,
  threshold,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldTrigger = pullDistance >= threshold;

  if (!isPulling && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200 md:hidden"
      style={{
        height: isRefreshing ? "60px" : `${Math.min(pullDistance, 60)}px`,
        opacity: isPulling || isRefreshing ? 1 : 0,
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {isRefreshing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Refreshing...</span>
          </>
        ) : (
          <>
            <div className="relative">
              <ArrowDown
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  shouldTrigger ? "text-primary" : "text-muted-foreground"
                )}
                style={{
                  transform: shouldTrigger ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
              <svg className="absolute inset-0 -m-2 h-9 w-9">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted"
                  opacity="0.2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn(
                    "transition-all duration-200",
                    shouldTrigger ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">
              {shouldTrigger ? "Release to refresh" : "Pull to refresh"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
